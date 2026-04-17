import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { apiClient } from "../api/client";
import { Button } from "../components/Button";
import { PhotoSlot } from "../components/PhotoSlot";
import { TextField } from "../components/TextField";
import { colors } from "../theme";
import { AuthSession, PersonAccessSummary, PersonDocumentOcrSuggestion, PersonDraft, PersonSearchResult, PhotoAsset, PhotoSearchResponse, Unit } from "../types";
import { buildOfflineAuditContext } from "../utils/audit";
import { enqueueOfflineOperation } from "../utils/offlineQueue";
import {
  displayPersonUnit,
  displayUnitName,
  formatPhone,
  isValidEmail,
  normalizeSearchText,
  personAttentionText,
  personCategoryText,
  personFaceStatusText,
  sanitizeDocumentInput,
  sanitizePhoneInput,
  sortPeopleByQuery,
  sortUnitsByQuery
} from "../utils/display";
import { canCreatePeople, canCreateResident, canManageFaces, canManageForecasts } from "../utils/permissions";
import { takePhoto } from "../utils/photo";
import { isUnitSelectionPending } from "../utils/sessionScope";
import { clearFaceDraft, clearPersonCreateDraft, loadFaceDraft, loadPeopleCache, loadPersonCreateDraft, saveFaceDraft, savePeopleCache, savePersonCreateDraft } from "../utils/storage";

type Props = {
  session: AuthSession;
  initialSearchQuery?: string;
  initialSearchVersion?: number;
  onDraftStateChange?: (hasDraft: boolean) => void;
};

const categories: Array<{ id: PersonDraft["category"]; label: string }> = [
  { id: "VISITOR", label: "Visitante" },
  { id: "SERVICE_PROVIDER", label: "Prestador" },
  { id: "DELIVERER", label: "Entregador" },
  { id: "RENTER", label: "Locatário" },
  { id: "RESIDENT", label: "Morador" }
];

const emptyDraft: PersonDraft = {
  name: "",
  document: "",
  documentType: "CPF",
  birthDate: "",
  phone: "",
  email: "",
  category: "VISITOR",
  unitId: undefined
};

export function FaceScreen({ session, initialSearchQuery, initialSearchVersion, onDraftStateChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionOffsets = useRef({ search: 0, basic: 0, basicLower: 0, unit: 0, photo: 0 });
  const [mode, setMode] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [selected, setSelected] = useState<PersonSearchResult | undefined>();
  const [photo, setPhoto] = useState<PhotoAsset | undefined>();
  const [photoLookupPhoto, setPhotoLookupPhoto] = useState<PhotoAsset | undefined>();
  const [photoLookupResult, setPhotoLookupResult] = useState<PhotoSearchResponse | undefined>();
  const [consent, setConsent] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchingByPhoto, setSearchingByPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingForecastId, setSavingForecastId] = useState<string | undefined>();
  const [savingPresenceAction, setSavingPresenceAction] = useState<"ENTRY" | "EXIT" | undefined>();
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [accessSummary, setAccessSummary] = useState<PersonAccessSummary | undefined>();
  const [draft, setDraft] = useState<PersonDraft>(emptyDraft);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitQuery, setUnitQuery] = useState("");
  const [searchingUnits, setSearchingUnits] = useState(false);
  const [readingDocument, setReadingDocument] = useState(false);
  const [documentSuggestion, setDocumentSuggestion] = useState<PersonDocumentOcrSuggestion | undefined>();
  const [selectedCreateUnit, setSelectedCreateUnit] = useState<Unit | undefined>();
  const [faceDraftHydrated, setFaceDraftHydrated] = useState(false);
  const [faceDraftRestoredAt, setFaceDraftRestoredAt] = useState<string | undefined>();
  const [createDraftHydrated, setCreateDraftHydrated] = useState(false);
  const [createDraftRestoredAt, setCreateDraftRestoredAt] = useState<string | undefined>();
  const [offlineTipDismissed, setOfflineTipDismissed] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const lastSeedRef = useRef<string | undefined>(undefined);

  const allowFace = useMemo(() => canManageFaces(session), [session]);
  const allowCreatePerson = useMemo(() => canCreatePeople(session), [session]);
  const allowCreateResident = useMemo(() => canCreateResident(session), [session]);
  const allowForecastActions = useMemo(() => canManageForecasts(session), [session]);
  const normalizedDocument = sanitizeDocumentInput(draft.document);
  const normalizedPhone = sanitizePhoneInput(draft.phone);
  const phoneFormatted = formatPhone(draft.phone);
  const birthDateFormatted = formatBirthDateInput(draft.birthDate);
  const birthDateInvalid = Boolean(draft.birthDate.trim() && !normalizeBirthDateForApi(draft.birthDate));
  const emailInvalid = Boolean(draft.email.trim() && !isValidEmail(draft.email));
  const residentNeedsUnit = draft.category === "RESIDENT" && !draft.unitId;
  const canSearchPeople = Boolean(allowFace && query.trim().length >= 2);
  const canSearchUnits = Boolean(allowCreatePerson && unitQuery.trim().length >= 2);
  const canCaptureFacePhoto = Boolean(allowFace && selected);
  const canSubmitFace = Boolean(allowFace && selected && photo && consent);
  const canSubmitPerson = Boolean(
    allowCreatePerson &&
      draft.name.trim() &&
      !birthDateInvalid &&
      !emailInvalid &&
      (!draft.document || normalizedDocument.length >= 5) &&
      (!draft.phone || normalizedPhone.length >= 10) &&
      !residentNeedsUnit &&
      (draft.category !== "RESIDENT" || allowCreateResident)
  );
  const createPersonValidationMessage = getCreatePersonValidationMessage({
    allowCreatePerson,
    allowCreateResident,
    category: draft.category,
    hasName: Boolean(draft.name.trim()),
    hasUnit: Boolean(draft.unitId),
    documentLength: normalizedDocument.length,
    birthDateInvalid,
    phoneLength: normalizedPhone.length,
    hasDocument: Boolean(draft.document),
    hasPhone: Boolean(draft.phone),
    emailInvalid
  });

  async function search() {
    await executeSearch(query);
  }

  async function executeSearch(value: string) {
    if (value.trim().length < 2) {
      Alert.alert("Busca", "Digite pelo menos 2 caracteres.");
      return;
    }

    try {
      setSearching(true);
      const result = sortPeopleByQuery(await apiClient.searchPeople(value.trim()), value.trim());
      setPeople(result);
      setSelected(undefined);
      setAccessSummary(undefined);
      await savePeopleCache(result.slice(0, 200));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível buscar pessoas.";
      if (isOfflineError(message)) {
        const cached = await loadPeopleCache();
        const normalizedQuery = normalizeSearchText(value.trim());
        const fallback = (cached?.data ?? []).filter((item) =>
          [
            item.name,
            item.document,
            item.unitId,
            item.unitName,
            ...(item.unitNames ?? [])
          ]
            .filter(Boolean)
            .some((field) => normalizeSearchText(String(field)).includes(normalizedQuery))
        );
        setPeople(sortPeopleByQuery(fallback, value.trim()));
        setSelected(undefined);
        setAccessSummary(undefined);
        Alert.alert(
          "Busca offline",
          fallback.length
            ? "Sem conexão com o servidor. Mostrando resultados encontrados no cache do aparelho."
            : "Sem conexão e sem resultados salvos no aparelho para essa busca. Você pode seguir para cadastro manual."
        );
        return;
      }

      setPeople([]);
      Alert.alert(
        "Falha na busca",
        message
      );
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    const seedKey = `${initialSearchVersion ?? 0}:${initialSearchQuery ?? ""}`;
    if (!initialSearchQuery || seedKey === lastSeedRef.current) {
      return;
    }

    lastSeedRef.current = seedKey;
    setMode("search");
    setQuery(initialSearchQuery);
    void executeSearch(initialSearchQuery);
  }, [initialSearchQuery, initialSearchVersion]);

  useEffect(() => {
    if (!query.trim()) {
      setPeople([]);
    }
  }, [query]);

  useEffect(() => {
    if (mode !== "search") {
      return;
    }

    const normalized = query.trim();
    if (normalized.length < 2) {
      setPeople([]);
      return;
    }

    const timer = setTimeout(() => {
      void executeSearch(normalized);
    }, 250);

    return () => clearTimeout(timer);
  }, [mode, query]);

  useEffect(() => {
    if (!unitQuery.trim()) {
      setUnits([]);
    }
  }, [unitQuery]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    const normalized = unitQuery.trim();
    if (normalized.length < 2) {
      setUnits([]);
      return;
    }

    if (selectedCreateUnit && displayUnitName(selectedCreateUnit).toLowerCase() !== normalized.toLowerCase()) {
      setSelectedCreateUnit(undefined);
      setDraft((current) => ({ ...current, unitId: undefined }));
    }

    const timer = setTimeout(() => {
      void searchUnits(normalized);
    }, 250);

    return () => clearTimeout(timer);
  }, [mode, selectedCreateUnit?.id, unitQuery]);

  useEffect(() => {
    setOfflineTipDismissed(false);
  }, [mode]);

  useEffect(() => {
    if (!allowFace && allowCreatePerson) {
      setMode("create");
    }
  }, [allowCreatePerson, allowFace]);

  useEffect(() => {
    setSubmitAttempted(false);
  }, [mode]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(Math.max(event.endCoordinates.height - 28, 0));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  function scrollAfterKeyboard(y?: number, extraTop = 140) {
    if (mode !== "create") {
      return;
    }

    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = setTimeout(() => {
      if (typeof y === "number") {
        scrollRef.current?.scrollTo({ y: Math.max(y - extraTop, 0), animated: true });
        return;
      }

      scrollRef.current?.scrollTo({ y: 110, animated: true });
    }, Platform.OS === "ios" ? 180 : 260);
  }

  useEffect(() => {
    async function hydrateFaceDraft() {
      const saved = await loadFaceDraft();
      if (saved && saved.operatorId && saved.operatorId !== session.operatorId) {
        await clearFaceDraft();
      } else if (saved && !isOlderThanHours(saved.updatedAt, 12)) {
        setMode("search");
        setQuery(saved.query);
        setSelected(saved.selected);
        setPhoto(saved.photo);
        setConsent(saved.consent);
        setFaceDraftRestoredAt(saved.updatedAt);
      } else if (saved) {
        await clearFaceDraft();
      }
      setFaceDraftHydrated(true);
    }

    void hydrateFaceDraft();
  }, []);

  useEffect(() => {
    if (!selected || accessSummary || loadingSummary) {
      return;
    }

    const selectedId = selected.id;

    async function loadSelectedSummary() {
      try {
        setLoadingSummary(true);
        const summary = await apiClient.getPersonAccessSummary(selectedId);
        setAccessSummary(summary);
      } catch {
        setAccessSummary(undefined);
      } finally {
        setLoadingSummary(false);
      }
    }

    void loadSelectedSummary();
  }, [accessSummary, loadingSummary, selected]);

  useEffect(() => {
    async function hydrateCreateDraft() {
      const saved = await loadPersonCreateDraft();
      if (saved && saved.operatorId && saved.operatorId !== session.operatorId) {
        await clearPersonCreateDraft();
      } else if (saved && !isOlderThanHours(saved.updatedAt, 12)) {
        setMode("create");
        setDraft(saved.draft);
        setUnitQuery(saved.unitQuery);
        setSelectedCreateUnit(saved.selectedUnit);
        setDocumentSuggestion(undefined);
        setCreateDraftRestoredAt(saved.updatedAt);
      } else if (saved) {
        await clearPersonCreateDraft();
      }
      setCreateDraftHydrated(true);
    }

    void hydrateCreateDraft();
  }, []);

  useEffect(() => {
    if (!faceDraftHydrated) {
      return;
    }

    const hasContent = Boolean(query.trim()) || Boolean(selected) || Boolean(photo) || Boolean(consent);
    onDraftStateChange?.(hasContent || hasCreateDraftContent(draft, unitQuery, selectedCreateUnit));
    if (!hasContent) {
      void clearFaceDraft();
      return;
    }

    void saveFaceDraft({
      operatorId: session.operatorId,
      query,
      selected,
      photo,
      consent,
      updatedAt: new Date().toISOString()
    });
  }, [consent, draft, faceDraftHydrated, onDraftStateChange, photo, query, selected, selectedCreateUnit, session.operatorId, unitQuery]);

  useEffect(() => {
    if (!createDraftHydrated) {
      return;
    }

    const hasContent =
      hasCreateDraftContent(draft, unitQuery, selectedCreateUnit);

    onDraftStateChange?.(hasContent || Boolean(query.trim()) || Boolean(selected) || Boolean(photo) || Boolean(consent));

    if (!hasContent) {
      void clearPersonCreateDraft();
      return;
    }

    void savePersonCreateDraft({
      operatorId: session.operatorId,
      draft,
      unitQuery,
      selectedUnit: selectedCreateUnit,
      updatedAt: new Date().toISOString()
    });
  }, [consent, createDraftHydrated, draft, onDraftStateChange, photo, query, selected, selectedCreateUnit, session.operatorId, unitQuery]);

  async function searchUnits(value?: string) {
    const text = (value ?? unitQuery).trim();
    if (text.length < 2) {
      Alert.alert("Unidades", "Digite pelo menos 2 caracteres.");
      return;
    }

    try {
      setSearchingUnits(true);
      const result = sortUnitsByQuery(await apiClient.searchUnits(text, 20), text);
      setUnits(result.slice(0, 20));
    } catch (error) {
      try {
        const allUnits = await apiClient.listUnits();
        setUnits(sortUnitsByQuery(allUnits, text).slice(0, 20));
      } catch (fallbackError) {
        setUnits([]);
        Alert.alert("Unidades", fallbackError instanceof Error ? fallbackError.message : "Não foi possível buscar unidades.");
      }
    } finally {
      setSearchingUnits(false);
    }
  }

  async function readDocument() {
    try {
      setReadingDocument(true);
      const documentPhoto = await takePhoto("documento", { maxDimension: 1280, compress: 0.58 });
      if (!documentPhoto) {
        return;
      }

      const suggestion = await apiClient.readPersonDocument(documentPhoto);
      setDocumentSuggestion(suggestion);
      const suggestedName = suggestion.prefill?.name?.trim() || suggestion.nameCandidates?.[0]?.trim() || suggestion.suggestedName?.trim() || "";
      const suggestedDocument = suggestion.prefill?.document || suggestion.documentCandidates?.[0] || suggestion.suggestedDocument || "";
      const suggestedDocumentType = suggestion.prefill?.documentType || suggestion.suggestedDocumentType || undefined;
      const suggestedBirthDate = suggestion.prefill?.birthDate || suggestion.suggestedBirthDate || undefined;
      setDraft((current) => ({
        ...current,
        name: suggestedName || current.name,
        document: suggestedDocument ? sanitizeDocumentInput(suggestedDocument).slice(0, (suggestedDocumentType ?? current.documentType) === "CPF" ? 11 : 20) : current.document,
        documentType:
          suggestedDocumentType === "CPF" || suggestedDocumentType === "RG" || suggestedDocumentType === "CNH"
            ? suggestedDocumentType
            : current.documentType,
        birthDate: suggestedBirthDate ? formatBirthDateInput(suggestedBirthDate) : current.birthDate
      }));
      Alert.alert("Documento lido", "Confira os dados sugeridos antes de salvar.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível ler o documento.";
      Alert.alert(
        "OCR do documento",
        isOfflineError(message)
          ? "Sem conexão para ler o documento agora. Você pode continuar preenchendo o cadastro manualmente."
          : message
      );
    } finally {
      setReadingDocument(false);
    }
  }

  async function captureFace() {
    try {
      const facePhoto = await takePhoto("face");
      if (facePhoto) {
        setPhoto(facePhoto);
      }
    } catch (error) {
      Alert.alert("Câmera", error instanceof Error ? error.message : "Não foi possível abrir a câmera.");
    }
  }

  async function searchByPhoto() {
    try {
      setSearchingByPhoto(true);
      const lookupPhoto = await takePhoto("busca-facial", { maxDimension: 640, compress: 0.25 });
      if (!lookupPhoto) {
        return;
      }

      setPhotoLookupPhoto(lookupPhoto);
      const result = await apiClient.searchPeopleByPhoto(lookupPhoto, 5);
      setPhotoLookupResult(result);
      setPeople([]);
      setQuery("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível identificar a pessoa pela foto.";
      if (isOfflineError(message)) {
        Alert.alert(
          "Busca por foto",
          "Essa identificação depende da API online. Conecte o aparelho e tente novamente."
        );
      } else {
        Alert.alert("Busca por foto", message);
      }
    } finally {
      setSearchingByPhoto(false);
    }
  }

  async function selectPerson(person: PersonSearchResult) {
    Keyboard.dismiss();
    setSelected(person);
    setAccessSummary(undefined);
    setQuery(person.name);
    setPeople([]);
    setPhoto(undefined);
    setConsent(false);

    try {
      setLoadingSummary(true);
      const summary = await apiClient.getPersonAccessSummary(person.id);
      setAccessSummary(summary);
    } catch {
      setAccessSummary(undefined);
    } finally {
      setLoadingSummary(false);
    }
  }

  async function capturePersonPhoto() {
    try {
      const personPhoto = await takePhoto("pessoa");
      if (personPhoto) {
        setDraft((current) => ({ ...current, photo: personPhoto }));
      }
    } catch (error) {
      Alert.alert("Câmera", error instanceof Error ? error.message : "Não foi possível abrir a câmera.");
    }
  }

  async function submitFace() {
    if (!selected || !photo || !consent) {
      Alert.alert("Cadastro facial", "Selecione a pessoa, tire a foto e confirme o consentimento.");
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.sendFace(selected.id, photo);
      Alert.alert(
        "Face salva",
        response.mode === "async"
          ? "Cadastro enviado para processamento. O sistema vai concluir a sincronização em segundo plano."
          : "Cadastro enviado para o controle de acesso."
      );
      setPhoto(undefined);
      setConsent(false);
      setFaceDraftRestoredAt(undefined);
      await clearFaceDraft();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";

      if (isOfflineError(message)) {
        await enqueueOfflineOperation({
          id: `queued-face-${Date.now()}`,
          type: "sendFace",
          createdAt: new Date().toISOString(),
          payload: {
            personId: selected.id,
            facePhoto: photo,
            audit: buildOfflineAuditContext({
              session,
              unitId: selected.unitId ?? selected.unit?.id ?? null,
              evidenceUrl: photo.uri
            })
          }
        });
        setPhoto(undefined);
        setConsent(false);
        setFaceDraftRestoredAt(undefined);
        await clearFaceDraft();
        Alert.alert("Sem conexão", "A face ficou pendente de envio e será sincronizada quando a internet voltar.");
      } else {
        Alert.alert("Falha ao enviar face", message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitPerson() {
    setSubmitAttempted(true);

    if (createPersonValidationMessage) {
      Alert.alert("Cadastro", createPersonValidationMessage);
      return;
    }

    try {
      setSaving(true);
      const created = await apiClient.createPerson({
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase()
      });
        setSelected(created);
        setPeople((current) => [created, ...current]);
        setMode("search");
        setQuery(created.name);
        setDraft(emptyDraft);
        setSubmitAttempted(false);
        setUnitQuery("");
        setUnits([]);
        setDocumentSuggestion(undefined);
        setSelectedCreateUnit(undefined);
        setCreateDraftRestoredAt(undefined);
        await clearPersonCreateDraft();
      Alert.alert("Pessoa cadastrada", "Agora você pode registrar a face dessa pessoa.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";

      if (isOfflineError(message)) {
        const queuedPerson = buildQueuedPerson(draft, selectedCreateUnit);
        await enqueueOfflineOperation({
          id: queuedPerson.id,
          type: "createPerson",
          createdAt: new Date().toISOString(),
          payload: {
            draft,
            audit: buildOfflineAuditContext({
              session,
              unitId: draft.unitId ?? null,
              evidenceUrl: draft.photo?.uri ?? null
            })
          }
        });
        setSelected(queuedPerson);
        setPeople((current) => [queuedPerson, ...current]);
        setMode("search");
        setQuery(queuedPerson.name);
        setDraft(emptyDraft);
        setSubmitAttempted(false);
        setUnitQuery("");
        setUnits([]);
        setDocumentSuggestion(undefined);
        setSelectedCreateUnit(undefined);
        setCreateDraftRestoredAt(undefined);
        await clearPersonCreateDraft();
        Alert.alert("Sem conexão", "A pessoa foi salva no aparelho e será enviada quando a internet voltar.");
      } else {
        Alert.alert("Falha ao cadastrar pessoa", message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeMatchedForecastStatus(person: PersonSearchResult, forecastId: string, status: "ARRIVED" | "EXPIRED") {
    try {
      setSavingForecastId(forecastId);
      const updated = await apiClient.updateVisitForecastStatus(forecastId, status);
      setPhotoLookupResult((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          matches: current.matches.map((match) => {
            if (match.person.id !== person.id) {
              return match;
            }

            return {
              ...match,
              activeVisitForecasts: match.activeVisitForecasts.map((forecast) =>
                getForecastKey(forecast) === forecastId ? { ...forecast, ...updated } : forecast
              )
            };
          })
        };
      });
      Alert.alert("Visita", status === "ARRIVED" ? "Chegada registrada." : "Saída registrada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a visita.";

      if (isOfflineError(message)) {
        await enqueueOfflineOperation({
          id: `queued-visit-${forecastId}-${Date.now()}`,
          type: "updateVisitForecastStatus",
          createdAt: new Date().toISOString(),
          payload: {
            id: forecastId,
            visitForecastId: forecastId,
            status,
            audit: buildOfflineAuditContext({
              session,
              unitId: person.unitId ?? person.unit?.id ?? null
            })
          }
        });
        setPhotoLookupResult((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            matches: current.matches.map((match) => {
              if (match.person.id !== person.id) {
                return match;
              }

              return {
                ...match,
                activeVisitForecasts: match.activeVisitForecasts.map((forecast) =>
                  getForecastKey(forecast) === forecastId
                    ? {
                        ...forecast,
                        status,
                        arrivedAt: status === "ARRIVED" ? new Date().toISOString() : forecast.arrivedAt,
                        departedAt: status === "EXPIRED" ? new Date().toISOString() : forecast.departedAt
                      }
                    : forecast
                )
              };
            })
          };
        });
        Alert.alert("Sem conexão", "A atualização da visita foi salva no aparelho e será sincronizada quando a internet voltar.");
      } else {
        Alert.alert("Visita", message);
      }
    } finally {
      setSavingForecastId(undefined);
    }
  }

  function applyPersonUpdate(personId: string, updater: (current: PersonSearchResult) => PersonSearchResult) {
    setSelected((current) => (current && current.id === personId ? updater(current) : current));
    setPeople((current) => current.map((item) => (item.id === personId ? updater(item) : item)));
    setPhotoLookupResult((current) =>
      current
        ? {
            ...current,
            matches: current.matches.map((match) =>
              match.person.id === personId
                ? {
                    ...match,
                    person: updater(match.person)
                  }
                : match
            )
          }
        : current
    );
  }

  function applyAccessSummaryAction(action: "ENTRY" | "EXIT") {
    const now = new Date().toISOString();
    setAccessSummary((current) =>
      current
        ? {
            ...current,
            totalAccesses: current.totalAccesses + 1,
            entries: current.entries + (action === "ENTRY" ? 1 : 0),
            exits: current.exits + (action === "EXIT" ? 1 : 0),
            accessesToday: (current.accessesToday ?? 0) + 1,
            isInsideNow: action === "ENTRY",
            lastAccessAt: now,
            lastDirection: action === "ENTRY" ? "ENTRY" : "EXIT",
            lastResult: "ALLOWED",
            lastEntryAt: action === "ENTRY" ? now : current.lastEntryAt,
            lastExitAt: action === "EXIT" ? now : current.lastExitAt
          }
        : current
    );
  }

  async function registerPresenceAction(action: "ENTRY" | "EXIT") {
    if (!selected) {
      Alert.alert("Acesso", "Selecione uma pessoa antes de registrar entrada ou saída.");
      return;
    }

    const targetStatus = action === "ENTRY" ? "ACTIVE" : "INACTIVE";
    const title = action === "ENTRY" ? "Registrar entrada" : "Registrar saída";
    const message =
      action === "ENTRY"
        ? `Confirma a entrada manual de ${selected.name}?`
        : `Confirma a saída manual de ${selected.name}?`;

    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: () => {
          void (async () => {
            try {
              setSavingPresenceAction(action);
              const updatedPerson = await apiClient.updatePersonStatus(selected.id, targetStatus);
              applyPersonUpdate(selected.id, (current) => ({
                ...current,
                ...updatedPerson,
                status: targetStatus,
                statusLabel: targetStatus === "ACTIVE" ? "Ativo" : "Inativo"
              }));

              let reportFailure: string | undefined;
              try {
                await apiClient.createOperationalAccessReport({
                  action,
                  personId: selected.id,
                  personName: selected.name,
                  unitId: selected.unitId ?? selected.unit?.id ?? null,
                  unitName: displayPersonUnit(selected),
                  category: normalizeOperationalCategory(selected.category ?? selected.type)
                });
              } catch (error) {
                reportFailure = error instanceof Error ? error.message : "Falha ao registrar o relatório operacional.";
              }

              applyAccessSummaryAction(action);
              Alert.alert(
                action === "ENTRY" ? "Entrada registrada" : "Saída registrada",
                reportFailure
                  ? `O status da pessoa foi atualizado, mas o relatório operacional falhou: ${reportFailure}`
                  : "Registro operacional concluído no padrão do Portaria."
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : "Não foi possível registrar o acesso.";

              if (isOfflineError(message)) {
                await enqueueOfflineOperation({
                  id: `queued-access-${selected.id}-${Date.now()}`,
                  type: "registerPresenceAccess",
                  createdAt: new Date().toISOString(),
                  payload: {
                    personId: selected.id,
                    personName: selected.name,
                    unitId: selected.unitId ?? selected.unit?.id ?? null,
                    unitName: displayPersonUnit(selected),
                    category: normalizeOperationalCategory(selected.category ?? selected.type),
                    action,
                    audit: buildOfflineAuditContext({
                      session,
                      unitId: selected.unitId ?? selected.unit?.id ?? null
                    })
                  }
                });
                applyPersonUpdate(selected.id, (current) => ({
                  ...current,
                  status: targetStatus,
                  statusLabel: targetStatus === "ACTIVE" ? "Ativo" : "Inativo"
                }));
                applyAccessSummaryAction(action);
                Alert.alert(
                  "Sem conexão",
                  `${action === "ENTRY" ? "A entrada" : "A saída"} foi salva no aparelho e será sincronizada quando a internet voltar.`
                );
              } else {
                Alert.alert("Acesso", message);
              }
            } finally {
              setSavingPresenceAction(undefined);
            }
          })();
        }
      }
    ]);
  }

  function clearSelectedPerson() {
    Keyboard.dismiss();
    setSelected(undefined);
    setAccessSummary(undefined);
    setPeople([]);
    setQuery("");
    setPhoto(undefined);
    setConsent(false);
    setFaceDraftRestoredAt(undefined);
    void clearFaceDraft();
  }

  function renderSearchMode() {
    return (
      <>
        {faceDraftRestoredAt ? (
          <View style={styles.infoCard}>
            <View style={styles.selectedHead}>
              <Text style={styles.infoTitle}>Rascunho recuperado</Text>
              <View style={styles.infoActions}>
                <Pressable onPress={() => setFaceDraftRestoredAt(undefined)} style={styles.clearSelection}>
                  <Text style={styles.clearSelectionText}>Ocultar</Text>
                </Pressable>
                <Pressable onPress={clearSelectedPerson} style={styles.clearSelection}>
                  <Text style={styles.clearSelectionText}>Descartar</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.infoText}>Cadastro facial restaurado do aparelho em {formatDateTime(faceDraftRestoredAt)}.</Text>
          </View>
        ) : null}
        <SectionHeader
          title="1. Buscar pessoa"
          subtitle=""
        />
        <View style={styles.searchRow} onLayout={(event) => { sectionOffsets.current.search = event.nativeEvent.layout.y; }}>
          <View style={styles.searchInput}>
            <TextField label="Nome, documento ou unidade" value={query} onChangeText={setQuery} onFocus={() => scrollAfterKeyboard(sectionOffsets.current.search, 180)} onSubmitEditing={search} autoCapitalize="none" returnKeyType="search" />
          </View>
          <Button style={styles.searchButton} loading={searching} disabled={!canSearchPeople} onPress={search}>
            Buscar
          </Button>
        </View>
        <View style={styles.photoLookupCard}>
          <View style={styles.selectedHead}>
            <Text style={styles.infoTitle}>Buscar por foto</Text>
            {photoLookupResult || photoLookupPhoto ? (
              <Pressable
                onPress={() => {
                  setPhotoLookupPhoto(undefined);
                  setPhotoLookupResult(undefined);
                }}
                style={styles.clearSelection}
              >
                <Text style={styles.clearSelectionText}>Limpar</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.infoText}>
            Use a câmera do celular para identificar a pessoa por reconhecimento facial reverso da API `5.3`.
          </Text>
          <PhotoSlot
            title="Foto para identificação"
            photo={photoLookupPhoto}
            onTakePhoto={searchByPhoto}
            onClearPhoto={() => {
              setPhotoLookupPhoto(undefined);
              setPhotoLookupResult(undefined);
            }}
            disabled={!allowFace || searchingByPhoto}
            buttonLabel={searchingByPhoto ? "Consultando..." : "Capturar e identificar"}
            helperText="Requer conexão com a API para comparar a foto."
          />
          {searchingByPhoto ? <Text style={styles.loadingHint}>Consultando reconhecimento facial...</Text> : null}
          {photoLookupResult ? (
            <View style={styles.photoLookupSummary}>
              <Text style={styles.photoLookupSummaryTitle}>
                {photoLookupResult.matched
                  ? `${photoLookupResult.matches.length} correspondência${photoLookupResult.matches.length === 1 ? "" : "s"} encontrada${photoLookupResult.matches.length === 1 ? "" : "s"}`
                  : "Nenhuma correspondência encontrada"}
              </Text>
              <Text style={styles.photoLookupSummaryText}>
                Estratégia: {photoLookupResult.matchStrategy || "não informada"}
              </Text>
            </View>
          ) : null}
        </View>
        {photoLookupResult?.matches.length ? (
          <View style={styles.verticalList}>
            {photoLookupResult.matches.map((match) => {
              const active = selected?.id === match.person.id;
              const forecastCount = match.activeVisitForecasts.length;

              return (
                <Pressable
                  key={`photo-match-${match.person.id}`}
                  disabled={!allowFace}
                  onPress={() => void selectPerson(match.person)}
                  style={[styles.person, styles.personVertical, active && styles.personActive]}
                >
                  <View style={styles.matchHeader}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {match.person.name}
                    </Text>
                    <Text style={styles.matchConfidence}>{formatConfidence(match.confidence)}%</Text>
                  </View>
                  <Text style={styles.personMeta} numberOfLines={2}>
                    {displayPersonUnit(match.person)}
                  </Text>
                  {match.residentUnit ? (
                    <Text style={styles.personStatus} numberOfLines={1}>
                      Unidade residente: {displayUnitName(match.residentUnit)}
                    </Text>
                  ) : null}
                  {match.possibleDestination ? (
                    <Text style={styles.personStatus} numberOfLines={2}>
                      Destino provável: {match.possibleDestination}
                    </Text>
                  ) : null}
                  {forecastCount ? (
                    <Text style={styles.personStatus} numberOfLines={2}>
                      {forecastCount} visita{forecastCount === 1 ? "" : "s"} ativa{forecastCount === 1 ? "" : "s"} para hoje.
                    </Text>
                  ) : null}
                  {forecastCount ? (
                    <View style={styles.matchForecastList}>
                      {match.activeVisitForecasts.map((forecast) => {
                        const forecastKey = getForecastKey(forecast);
                        const canMarkArrival = allowForecastActions && forecast.status !== "ARRIVED" && !forecast.arrivedAt;
                        const canMarkExit = allowForecastActions && (forecast.status === "ARRIVED" || Boolean(forecast.arrivedAt)) && !forecast.departedAt;

                        return (
                          <View key={forecastKey} style={styles.matchForecastCard}>
                            <Text style={styles.matchForecastTitle} numberOfLines={1}>
                              {forecast.visitorName || match.person.name}
                            </Text>
                            <Text style={styles.matchForecastMeta} numberOfLines={2}>
                              {forecast.unitName || match.possibleDestination || displayPersonUnit(match.person)}
                            </Text>
                            <Text style={styles.matchForecastMeta}>
                              Janela: {formatShortDateTime(forecast.expectedEntryAt)} até {formatShortDateTime(forecast.expectedExitAt)}
                            </Text>
                            <Text style={styles.matchForecastMeta}>
                              Status: {visitForecastStatusText(forecast.status)}
                            </Text>
                            <View style={styles.matchForecastActions}>
                              {canMarkArrival ? (
                                <Pressable
                                  onPress={() => void changeMatchedForecastStatus(match.person, forecastKey, "ARRIVED")}
                                  style={[styles.matchForecastAction, savingForecastId === forecastKey && styles.matchForecastActionDisabled]}
                                  disabled={savingForecastId === forecastKey}
                                >
                                  <Text style={styles.matchForecastActionText}>
                                    {savingForecastId === forecastKey ? "Salvando..." : "Registrar chegada"}
                                  </Text>
                                </Pressable>
                              ) : null}
                              {canMarkExit ? (
                                <Pressable
                                  onPress={() => void changeMatchedForecastStatus(match.person, forecastKey, "EXPIRED")}
                                  style={[styles.matchForecastAction, savingForecastId === forecastKey && styles.matchForecastActionDisabled]}
                                  disabled={savingForecastId === forecastKey}
                                >
                                  <Text style={styles.matchForecastActionText}>
                                    {savingForecastId === forecastKey ? "Salvando..." : "Registrar saída"}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                  <View style={styles.personFooter}>
                    <Text style={styles.personType}>{personCategoryText(match.person)}</Text>
                    <Text style={styles.personStatus} numberOfLines={1}>
                      {personFaceStatusText(match.person)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {query.trim() && !canSearchPeople ? <Text style={styles.resultHint}>Digite pelo menos 2 caracteres para buscar pessoa.</Text> : null}
        {searching ? <Text style={styles.loadingHint}>Buscando pessoas...</Text> : null}
        {people.length ? <Text style={styles.resultHint}>{people.length} pessoa{people.length === 1 ? "" : "s"} encontrada{people.length === 1 ? "" : "s"}.</Text> : null}
        {query.trim() ? (
          <Pressable
            onPress={() => {
              setQuery("");
              setPeople([]);
            }}
            style={styles.linkAction}
          >
            <Text style={styles.linkActionText}>Limpar busca de pessoa</Text>
          </Pressable>
        ) : null}
        {query.trim().length >= 2 && !searching && !people.length ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Nenhuma pessoa encontrada</Text>
            <Text style={styles.infoText}>Tente nome, documento, unidade ou abra um novo cadastro.</Text>
            <View style={styles.infoActions}>
              {allowCreatePerson ? (
                <Pressable
                  onPress={() => {
                    setDraft((current) => ({ ...current, name: query.trim() }));
                    setMode("create");
                  }}
                  style={styles.infoAction}
                >
                    <Text style={styles.infoActionText}>Novo cadastro com este nome</Text>
                </Pressable>
              ) : null}
              {allowCreatePerson ? (
                <Pressable
                  onPress={() => {
                    setMode("create");
                    const nextQuery = query.trim();
                    setUnitQuery(nextQuery);
                    void searchUnits(nextQuery);
                  }}
                  style={styles.infoAction}
                >
                    <Text style={styles.infoActionText}>Buscar como unidade</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setQuery("")} style={styles.infoAction}>
                <Text style={styles.infoActionText}>Limpar busca</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {people.length ? (
          <View style={styles.verticalList}>
            {people.map((item) => {
              const active = selected?.id === item.id;
              return (
                <Pressable key={item.id} disabled={!allowFace} onPress={() => void selectPerson(item)} style={[styles.person, styles.personVertical, active && styles.personActive]}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.personMeta} numberOfLines={1}>
                    {displayPersonUnit(item)}
                  </Text>
                  <View style={styles.personFooter}>
                    <Text style={styles.personType}>{personCategoryText(item)}</Text>
                    <Text style={styles.personStatus} numberOfLines={1}>
                      {personFaceStatusText(item)}
                    </Text>
                  </View>
                  {(item.pendingDeliveries || item.linkedUnreadAlerts) ? (
                    <Text style={styles.personStatus} numberOfLines={1}>
                      {item.pendingDeliveries ? `${item.pendingDeliveries} encomenda${item.pendingDeliveries === 1 ? "" : "s"} pendente${item.pendingDeliveries === 1 ? "" : "s"}` : ""}
                      {item.pendingDeliveries && item.linkedUnreadAlerts ? " • " : ""}
                      {item.linkedUnreadAlerts ? `${item.linkedUnreadAlerts} alerta${item.linkedUnreadAlerts === 1 ? "" : "s"} não lido${item.linkedUnreadAlerts === 1 ? "" : "s"}` : ""}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.selectedCard}>
          <View style={styles.selectedHead}>
          <Text style={styles.selectedLabel}>Pessoa selecionada</Text>
            {selected ? (
              <Pressable onPress={clearSelectedPerson} style={styles.clearSelection}>
                <Text style={styles.clearSelectionText}>Limpar</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.selectedName}>{selected?.name ?? "Nenhuma pessoa selecionada"}</Text>
          <Text style={styles.selectedMeta}>
            Unidade: {selected ? displayPersonUnit(selected) : "busque e selecione acima"}
          </Text>
          {selected ? <Text style={styles.selectedDetail}>{personCategoryText(selected)}</Text> : null}
          {selected ? <Text style={styles.selectedDetail}>Face: {personFaceStatusText(selected)}</Text> : null}
        </View>
        {selected ? (
          <View style={styles.presenceActionsCard}>
            <Text style={styles.infoTitle}>Registro manual de acesso</Text>
            <Text style={styles.infoText}>
              Use o mesmo padrão operacional do Portaria para marcar entrada ou saída da pessoa selecionada.
            </Text>
            <View style={styles.presenceActionsRow}>
              <Button
                variant="secondary"
                compact
                loading={savingPresenceAction === "ENTRY"}
                disabled={Boolean(savingPresenceAction) || accessSummary?.isInsideNow === true}
                onPress={() => void registerPresenceAction("ENTRY")}
                style={styles.presenceActionButton}
              >
                Registrar entrada
              </Button>
              <Button
                variant="secondary"
                compact
                loading={savingPresenceAction === "EXIT"}
                disabled={Boolean(savingPresenceAction) || accessSummary?.isInsideNow === false}
                onPress={() => void registerPresenceAction("EXIT")}
                style={styles.presenceActionButton}
              >
                Registrar saída
              </Button>
            </View>
          </View>
        ) : null}
        {selected && personAttentionText(selected) ? (
          <View style={styles.attentionCard}>
            <Text style={styles.attentionTitle}>Conferência recomendada</Text>
            <Text style={styles.attentionText}>{personAttentionText(selected)}</Text>
          </View>
        ) : null}
        {selected && (selected.pendingDeliveries || selected.linkedUnreadAlerts) ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Resumo operacional</Text>
            <Text style={styles.infoText}>
              {selected.pendingDeliveries ? `${selected.pendingDeliveries} encomenda${selected.pendingDeliveries === 1 ? "" : "s"} pendente${selected.pendingDeliveries === 1 ? "" : "s"}` : ""}
              {selected.pendingDeliveries && selected.linkedUnreadAlerts ? " • " : ""}
              {selected.linkedUnreadAlerts ? `${selected.linkedUnreadAlerts} alerta${selected.linkedUnreadAlerts === 1 ? "" : "s"} não lido${selected.linkedUnreadAlerts === 1 ? "" : "s"}` : ""}
            </Text>
          </View>
        ) : null}
        {selected?.hasFacialCredential ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Face já cadastrada</Text>
            <Text style={styles.infoText}>Esta pessoa já possui credencial facial no sistema. Registre uma nova foto apenas se for para atualizar o cadastro.</Text>
          </View>
        ) : null}
        {selected ? (
          <View style={styles.summaryAccessCard}>
            <View style={styles.summaryAccessHead}>
              <Text style={styles.summaryAccessTitle}>Últimos acessos</Text>
              {loadingSummary ? <Text style={styles.summaryAccessHint}>Atualizando...</Text> : null}
            </View>
            {accessSummary ? (
              <>
                <View style={styles.summaryAccessGrid}>
                  <MiniStat label="Hoje" value={String(accessSummary.accessesToday ?? 0)} />
                  <MiniStat label="Entradas" value={String(accessSummary.entries)} />
                  <MiniStat label="Saídas" value={String(accessSummary.exits)} />
                  <MiniStat label="Negados" value={String(accessSummary.denied)} danger={Boolean(accessSummary.denied)} />
                </View>
                <Text style={styles.summaryAccessText}>{accessSummary.isInsideNow ? "No condomínio agora." : "Fora do condomínio agora."}</Text>
                {accessSummary.lastAccessAt ? (
                  <Text style={styles.summaryAccessText}>
                    Último acesso: {formatDateTime(accessSummary.lastAccessAt)}
                    {accessSummary.lastResult ? ` - ${accessResultText(accessSummary.lastResult)}` : ""}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.summaryAccessText}>Sem resumo disponível para esta pessoa.</Text>
            )}
          </View>
        ) : null}

        <SectionHeader
          title="2. Registrar face"
          subtitle=""
        />
        <PhotoSlot title="Foto do rosto" photo={photo} onTakePhoto={captureFace} onClearPhoto={() => setPhoto(undefined)} disabled={!canCaptureFacePhoto} />

        <View style={styles.consent}>
          <View style={styles.consentText}>
            <Text style={styles.consentTitle}>Consentimento registrado</Text>
            <Text style={styles.consentHelp}>Confirmo que a pessoa autorizou o uso da imagem.</Text>
          </View>
          <Switch
            value={consent}
            disabled={!allowFace}
            onValueChange={setConsent}
            trackColor={{ true: "#A9D8CB", false: "#CED8D4" }}
          />
        </View>

        <Button loading={saving} disabled={!canSubmitFace} onPress={submitFace}>
          {selected?.hasFacialCredential ? "Atualizar face" : "Salvar face"}
        </Button>
      </>
    );
  }

  function renderCreateMode() {
    return (
      <>
        {createDraftRestoredAt ? (
          <View style={styles.infoCard}>
            <View style={styles.selectedHead}>
              <Text style={styles.infoTitle}>Rascunho recuperado</Text>
              <View style={styles.infoActions}>
                <Pressable onPress={() => setCreateDraftRestoredAt(undefined)} style={styles.clearSelection}>
                  <Text style={styles.clearSelectionText}>Ocultar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDraft(emptyDraft);
                    setUnitQuery("");
                    setUnits([]);
                    setSelectedCreateUnit(undefined);
                    setCreateDraftRestoredAt(undefined);
                    void clearPersonCreateDraft();
                  }}
                  style={styles.clearSelection}
                >
                  <Text style={styles.clearSelectionText}>Descartar</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.infoText}>Cadastro restaurado do aparelho em {formatDateTime(createDraftRestoredAt)}.</Text>
          </View>
        ) : null}
        {!offlineTipDismissed ? (
          <View style={styles.infoCard}>
            <View style={styles.selectedHead}>
              <Text style={styles.infoTitle}>Funciona offline</Text>
              <Pressable onPress={() => setOfflineTipDismissed(true)} style={styles.clearSelection}>
                <Text style={styles.clearSelectionText}>Ocultar</Text>
              </Pressable>
            </View>
            <Text style={styles.infoText}>Pessoa e face podem ficar salvas no aparelho e sincronizar depois.</Text>
          </View>
        ) : null}
        <View style={styles.createActionsRow}>
          <Button variant="secondary" compact loading={readingDocument} onPress={() => void readDocument()} style={styles.createActionButton}>
            Ler documento
          </Button>
          <Button
            variant="secondary"
            compact
            onPress={() => {
              setDraft(emptyDraft);
              setUnitQuery("");
              setUnits([]);
              setSelectedCreateUnit(undefined);
              setDocumentSuggestion(undefined);
              setCreateDraftRestoredAt(undefined);
              void clearPersonCreateDraft();
            }}
            style={styles.createActionButton}
          >
            Limpar cadastro
          </Button>
        </View>
        {documentSuggestion ? (
          <View style={styles.infoCard}>
            <View style={styles.selectedHead}>
              <Text style={styles.infoTitle}>Sugestão do documento</Text>
              <Pressable onPress={() => setDocumentSuggestion(undefined)} style={styles.clearSelection}>
                <Text style={styles.clearSelectionText}>Ocultar</Text>
              </Pressable>
            </View>
            <Text style={styles.infoText}>
              {buildDocumentSuggestionSummary(documentSuggestion)}
            </Text>
          </View>
        ) : null}
        <SectionHeader
          title="1. Dados básicos"
          subtitle=""
        />
        <View style={styles.form} onLayout={(event) => { sectionOffsets.current.basic = event.nativeEvent.layout.y; }}>
          <TextField
            label="Nome completo"
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            autoCapitalize="words"
            required
            helperText="Obrigatório para qualquer cadastro."
            errorText={submitAttempted && !draft.name.trim() ? "Preencha o nome completo para continuar." : undefined}
          />
          <View style={styles.chips}>
            {categories.map((category) => {
              const active = draft.category === category.id;
              const disabled = !allowCreatePerson || (category.id === "RESIDENT" && !allowCreateResident);

              return (
                <Pressable
                  key={category.id}
                  disabled={disabled}
                  onPress={() => setDraft((current) => ({ ...current, category: category.id }))}
                  style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {!allowCreateResident ? <Text style={styles.ruleHint}>Morador só pode ser cadastrado por administrador.</Text> : null}

          <View style={styles.documentTypeRow}>
            {(["CPF", "RG", "CNH"] as const).map((type) => {
              const active = draft.documentType === type;
              return (
                <Pressable
                  key={type}
                  disabled={!allowCreatePerson}
                  onPress={() => setDraft((current) => ({ ...current, documentType: type }))}
                  style={[styles.docChip, active && styles.docChipActive, !allowCreatePerson && styles.chipDisabled]}
                >
                  <Text style={[styles.docChipText, active && styles.docChipTextActive]}>{type}</Text>
                </Pressable>
              );
            })}
          </View>
            <TextField
              label={`Documento ${draft.documentType}`}
              value={draft.document}
              onChangeText={(document) => setDraft((current) => ({ ...current, document: sanitizeDocumentInput(document).slice(0, current.documentType === "CPF" ? 11 : 20) }))}
              autoCapitalize="characters"
              maxLength={draft.documentType === "CPF" ? 11 : 20}
              onFocus={() => scrollAfterKeyboard(sectionOffsets.current.basic, 72)}
              helperText="Opcional. Se informar, confira antes de salvar."
              errorText={draft.document && normalizedDocument.length < 5 ? "Documento muito curto. Confira antes de salvar." : undefined}
            />
            <TextField
              label="Data de nascimento"
              value={birthDateFormatted}
              onChangeText={(birthDate) => setDraft((current) => ({ ...current, birthDate: formatBirthDateInput(birthDate) }))}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              helperText="Opcional. Use DD/MM/AAAA somente quando essa informação existir."
              errorText={birthDateInvalid ? "Use uma data válida no formato DD/MM/AAAA." : undefined}
            />
          {draft.document ? (
            <Pressable onPress={() => setDraft((current) => ({ ...current, document: "" }))} style={styles.linkAction}>
              <Text style={styles.linkActionText}>Limpar documento</Text>
            </Pressable>
          ) : null}
            <TextField
              label="Telefone"
              value={phoneFormatted}
              onChangeText={(phone) => setDraft((current) => ({ ...current, phone: sanitizePhoneInput(phone) }))}
              keyboardType="phone-pad"
              autoCapitalize="none"
              maxLength={15}
              onFocus={() => scrollAfterKeyboard(sectionOffsets.current.basicLower, 96)}
              onLayout={() => {
                sectionOffsets.current.basicLower = Math.max(sectionOffsets.current.basicLower, sectionOffsets.current.basic + 260);
              }}
              helperText="Opcional. Informe com DDD se quiser salvar."
              errorText={draft.phone && normalizedPhone.length < 10 ? "Telefone incompleto. Use DDD + número." : undefined}
            />
          {draft.phone ? (
            <Pressable onPress={() => setDraft((current) => ({ ...current, phone: "" }))} style={styles.linkAction}>
              <Text style={styles.linkActionText}>Limpar telefone</Text>
            </Pressable>
          ) : null}
            <TextField
              label="E-mail"
              value={draft.email}
              onChangeText={(email) => setDraft((current) => ({ ...current, email: email.trim().toLowerCase() }))}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => scrollAfterKeyboard(sectionOffsets.current.basicLower, 96)}
              helperText="Opcional. Se informar, o formato precisa estar válido."
              errorText={emailInvalid ? "E-mail com formato inválido." : undefined}
            />
          {draft.email ? (
            <Pressable onPress={() => setDraft((current) => ({ ...current, email: "" }))} style={styles.linkAction}>
              <Text style={styles.linkActionText}>Limpar e-mail</Text>
            </Pressable>
          ) : null}
        </View>
        <SectionHeader
          title="2. Vincular unidade"
          subtitle=""
        />
        <View style={styles.searchRow} onLayout={(event) => { sectionOffsets.current.unit = event.nativeEvent.layout.y; }}>
          <View style={styles.searchInput}>
            <TextField
              label="Buscar unidade"
              required={draft.category === "RESIDENT"}
              value={unitQuery}
              onChangeText={setUnitQuery}
              placeholder="Casa, bloco, apartamento"
              onFocus={() => scrollAfterKeyboard(sectionOffsets.current.unit, 180)}
              onSubmitEditing={() => {
                void searchUnits();
              }}
              autoCapitalize="none"
              returnKeyType="search"
              helperText={draft.category === "RESIDENT" ? "Obrigatória para morador." : "Opcional para visitante, prestador, entregador e locatário."}
              errorText={submitAttempted && draft.category === "RESIDENT" && !draft.unitId ? "Selecione a unidade do morador antes de salvar." : undefined}
            />
          </View>
          <Button style={styles.searchButton} loading={searchingUnits} disabled={!canSearchUnits} onPress={searchUnits}>
            Buscar
          </Button>
        </View>
        {unitQuery.trim() && !canSearchUnits ? <Text style={styles.resultHint}>Digite pelo menos 2 caracteres para buscar unidade.</Text> : null}
        {searchingUnits ? <Text style={styles.loadingHint}>Buscando unidades...</Text> : null}
        {units.length ? <Text style={styles.resultHint}>{units.length} unidade{units.length === 1 ? "" : "s"} encontrada{units.length === 1 ? "" : "s"}.</Text> : null}
        {unitQuery.trim() ? (
          <Pressable
            onPress={() => {
              setUnitQuery("");
              setUnits([]);
            }}
            style={styles.linkAction}
          >
            <Text style={styles.linkActionText}>Limpar busca de unidade</Text>
          </Pressable>
        ) : null}
        {unitQuery.trim().length >= 2 && !searchingUnits && !units.length && !draft.unitId ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Nenhuma unidade localizada</Text>
            <Text style={styles.infoText}>Tente casa, bloco, rua, quadra, lote ou outra parte do identificador.</Text>
            <View style={styles.infoActions}>
              {draft.category !== "RESIDENT" ? (
                <Pressable onPress={() => setUnitQuery("")} style={styles.infoAction}>
                  <Text style={styles.infoActionText}>Continuar sem unidade</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  setUnitQuery("");
                  setUnits([]);
                }}
                style={styles.infoAction}
              >
                <Text style={styles.infoActionText}>Limpar busca</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {units.length ? (
          <View style={styles.verticalList}>
            {units.map((item) => {
              const active = draft.unitId === item.id;
              return (
                <Pressable
                  key={item.id}
                  disabled={!allowCreatePerson}
                  onPress={() => {
                    Keyboard.dismiss();
                    setDraft((current) => ({ ...current, unitId: item.id }));
                    setSelectedCreateUnit(item);
                    setUnitQuery(displayUnitName(item));
                    setUnits([]);
                  }}
                  style={[styles.person, styles.personVertical, active && styles.personActive]}
                >
                  <Text style={styles.personName} numberOfLines={1}>
                    {item.nome || item.name}
                  </Text>
                  <Text style={styles.personMeta} numberOfLines={1}>
                    {displayUnitName(item)}
                  </Text>
                  {item.condominioNome ? (
                    <Text style={styles.personStatus} numberOfLines={1}>
                      {item.condominioNome}
                    </Text>
                  ) : null}
                  <Text style={styles.personType}>Unidade</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {selectedCreateUnit ? (
          <View style={styles.selectedCard}>
            <View style={styles.selectedHead}>
              <Text style={styles.selectedLabel}>Unidade selecionada</Text>
              <Pressable
                onPress={() => {
                  setDraft((current) => ({ ...current, unitId: undefined }));
                  setSelectedCreateUnit(undefined);
                  setUnitQuery("");
                  setUnits([]);
                }}
                style={styles.clearSelection}
              >
                <Text style={styles.clearSelectionText}>Limpar</Text>
              </Pressable>
            </View>
            <Text style={styles.selectedName}>{displayUnitName(selectedCreateUnit)}</Text>
          </View>
        ) : draft.category === "RESIDENT" ? (
          <View style={styles.attentionCard}>
            <Text style={styles.attentionTitle}>Unidade obrigatória</Text>
            <Text style={styles.attentionText}>Morador precisa estar vinculado a uma unidade antes do cadastro.</Text>
          </View>
        ) : null}

        <SectionHeader
          title="3. Registrar foto"
          subtitle=""
        />
        <View onLayout={(event) => { sectionOffsets.current.photo = event.nativeEvent.layout.y; }}>
          <PhotoSlot
            title="Foto da pessoa"
            photo={draft.photo}
            onTakePhoto={capturePersonPhoto}
            onClearPhoto={() => setDraft((current) => ({ ...current, photo: undefined }))}
            disabled={!allowCreatePerson}
          />
        </View>

        <Button loading={saving} disabled={!canSubmitPerson} onPress={submitPerson}>
          Cadastrar pessoa
        </Button>
      </>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={24} style={{ flex: 1 }}>
    <ScrollView ref={scrollRef} contentContainerStyle={[styles.screen, { paddingBottom: 160 + keyboardInset }]} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      <Text style={styles.help}>Buscar pessoa, registrar face ou abrir cadastro rápido.</Text>
      {!allowFace && !allowCreatePerson ? (
        <View style={styles.readOnlyCard}>
          <Text style={styles.readOnlyTitle}>Perfil sem cadastro operacional</Text>
          <Text style={styles.readOnlyText}>Este acesso pode consultar o sistema, mas não registrar nova face ou nova pessoa.</Text>
        </View>
      ) : null}
      {isUnitSelectionPending(session) ? (
        <View style={styles.readOnlyCard}>
          <Text style={styles.readOnlyTitle}>Unidade obrigatória na sessão</Text>
          <Text style={styles.readOnlyText}>Selecione a unidade na sessão para continuar.</Text>
        </View>
      ) : null}

      <View style={styles.modeTabs}>
        <Pressable onPress={() => setMode("search")} style={[styles.modeTab, mode === "search" && styles.modeTabActive]}>
          <Text style={[styles.modeTabText, mode === "search" && styles.modeTabTextActive]}>Buscar</Text>
        </Pressable>
        <Pressable disabled={!allowCreatePerson} onPress={() => setMode("create")} style={[styles.modeTab, mode === "create" && styles.modeTabActive, !allowCreatePerson && styles.modeTabDisabled]}>
          <Text style={[styles.modeTabText, mode === "create" && styles.modeTabTextActive]}>Novo cadastro</Text>
        </Pressable>
      </View>

      {mode === "search" ? renderSearchMode() : renderCreateMode()}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProgressStep({
  index,
  label,
  done
}: {
  index: number;
  label: string;
  done: boolean;
}) {
  return (
    <View style={[styles.progressStep, done && styles.progressStepDone]}>
      <Text style={[styles.progressStepIndex, done && styles.progressStepIndexDone]}>{index}</Text>
      <Text style={[styles.progressStepLabel, done && styles.progressStepLabelDone]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function buildQueuedPerson(draft: PersonDraft, selectedUnit?: Unit): PersonSearchResult {
  return {
    id: `queued-person-${Date.now()}`,
    name: draft.name.trim(),
    document: draft.document.trim(),
    birthDate: normalizeBirthDateForApi(draft.birthDate) ?? undefined,
    unitId: draft.unitId,
    unit: selectedUnit,
    category: draft.category,
    categoryLabel: personCategoryLabel(draft.category),
    statusLabel: "Pendente de sincronização",
    email: draft.email.trim().toLowerCase() || undefined,
    phone: draft.phone || undefined
  };
}

function SummaryCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "success" | "muted";
}) {
  return (
    <View style={[styles.summaryCard, tone === "success" ? styles.summaryCardSuccess : styles.summaryCardMuted]}>
      <Text style={[styles.summaryValue, tone === "muted" && styles.summaryValueMuted]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={[styles.miniStat, danger && styles.miniStatDanger]}>
      <Text style={[styles.miniStatValue, danger && styles.miniStatValueDanger]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function formatConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const normalized = value <= 1 ? value * 100 : value;
  return normalized.toFixed(normalized >= 100 ? 0 : 1).replace(/\.0$/, "");
}

function getForecastKey(value: { id?: string; visitForecastId?: string }) {
  return value.id ?? value.visitForecastId ?? "";
}

function visitForecastStatusText(value: string) {
  const labels: Record<string, string> = {
    PENDING_ARRIVAL: "Aguardando chegada",
    ARRIVED: "Dentro do condomínio",
    EXPIRED: "Encerrada",
    CANCELLED: "Cancelada",
    NO_SHOW: "Não compareceu",
    COMPLETED: "Concluída"
  };

  return labels[value] ?? value;
}

function normalizeOperationalCategory(value?: string | null) {
  const normalized = (value ?? "").toUpperCase();
  if (normalized.includes("RESIDENT") || normalized.includes("MORADOR")) {
    return "RESIDENT";
  }
  if (normalized.includes("SERVICE") || normalized.includes("PRESTADOR")) {
    return "SERVICE_PROVIDER";
  }
  if (normalized.includes("DELIVER")) {
    return "DELIVERER";
  }
  if (normalized.includes("RENTER") || normalized.includes("LOCAT")) {
    return "RENTER";
  }
  return "VISITOR";
}

function formatShortDateTime(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function personCategoryLabel(category: PersonDraft["category"]) {
  const labels: Record<PersonDraft["category"], string> = {
    RESIDENT: "Morador",
    VISITOR: "Visitante",
    SERVICE_PROVIDER: "Prestador",
    DELIVERER: "Entregador",
    RENTER: "Locatário"
  };

  return labels[category];
}

function isOfflineError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("network request failed") || normalized.includes("failed to fetch") || normalized.includes("timeout");
}

function getFaceNextAction({
  allowFace,
  selected,
  hasFacialCredential,
  photo,
  consent
}: {
  allowFace: boolean;
  selected: boolean;
  hasFacialCredential: boolean;
  photo: boolean;
  consent: boolean;
}) {
  if (!allowFace) {
    return "Seu perfil não está liberado para cadastrar faces. Use esta tela apenas para consulta.";
  }

  if (!selected) {
    return "Comece buscando e selecionando a pessoa que vai receber o cadastro facial.";
  }

  if (hasFacialCredential && !photo) {
    return "A pessoa já tem credencial facial. Registre nova foto apenas se precisar atualizar esse cadastro.";
  }

  if (!photo) {
    return "Registre a foto do rosto para preparar o envio ao sistema de acesso.";
  }

  if (!consent) {
    return "Confirme o consentimento antes de salvar a face.";
  }

  return "Tudo conferido. Salve a face para enviar o cadastro ao sistema.";
}

function getCreatePersonNextAction({
  allowCreatePerson,
  allowCreateResident,
  category,
  hasName,
  hasUnit,
  hasPhoto
}: {
  allowCreatePerson: boolean;
  allowCreateResident: boolean;
  category: PersonDraft["category"];
  hasName: boolean;
  hasUnit: boolean;
  hasPhoto: boolean;
}) {
  if (!allowCreatePerson) {
    return "Seu perfil não está liberado para cadastrar pessoas novas.";
  }

  if (category === "RESIDENT" && !allowCreateResident) {
    return "Morador continua restrito ao perfil administrador. Escolha outra categoria ou use um acesso administrativo.";
  }

  if (!hasName) {
    return "Comece preenchendo o nome completo e o tipo de cadastro.";
  }

  if (category === "RESIDENT" && !hasUnit) {
    return "Vincule o morador a uma unidade antes de concluir o cadastro.";
  }

  if (!hasPhoto) {
    return "Registre a foto da pessoa para deixar o cadastro mais completo.";
  }

  return "Cadastro pronto. Salve a pessoa e, se necessário, siga direto para o cadastro facial.";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function accessResultText(value: string) {
  if (value === "ALLOWED") return "liberado";
  if (value === "DENIED") return "negado";
  return value;
}

function hasCreateDraftContent(draft: PersonDraft, unitQuery: string, selectedCreateUnit?: Unit) {
  return (
    Boolean(draft.name.trim()) ||
    Boolean(draft.document.trim()) ||
    Boolean(draft.birthDate.trim()) ||
    Boolean(draft.phone.trim()) ||
    Boolean(draft.email.trim()) ||
    Boolean(draft.unitId) ||
    Boolean(draft.photo) ||
    Boolean(unitQuery.trim()) ||
    Boolean(selectedCreateUnit) ||
    draft.category !== "VISITOR"
  );
}

function getCreatePersonValidationMessage({
  allowCreatePerson,
  allowCreateResident,
  category,
  hasName,
  hasUnit,
  documentLength,
  birthDateInvalid,
  phoneLength,
  hasDocument,
  hasPhone,
  emailInvalid
}: {
  allowCreatePerson: boolean;
  allowCreateResident: boolean;
  category: PersonDraft["category"];
  hasName: boolean;
  hasUnit: boolean;
  documentLength: number;
  birthDateInvalid: boolean;
  phoneLength: number;
  hasDocument: boolean;
  hasPhone: boolean;
  emailInvalid: boolean;
}) {
  if (!allowCreatePerson) {
    return "Seu perfil não está liberado para cadastrar pessoas.";
  }

  if (!hasName) {
    return "Preencha o nome completo para continuar.";
  }

  if (hasDocument && documentLength < 5) {
    return "Confira o documento antes de salvar.";
  }

  if (birthDateInvalid) {
    return "Confira a data de nascimento antes de salvar.";
  }

  if (hasPhone && phoneLength < 10) {
    return "Informe telefone com DDD e número completo.";
  }

  if (emailInvalid) {
    return "Confira o e-mail antes de salvar.";
  }

  if (category === "RESIDENT" && !hasUnit) {
    return "Selecione a unidade do morador antes de salvar.";
  }

  if (category === "RESIDENT" && !allowCreateResident) {
    return "Morador só pode ser cadastrado por administrador.";
  }

  return undefined;
}

function isOlderThanHours(value: string, hours: number) {
  return Date.now() - new Date(value).getTime() > hours * 60 * 60 * 1000;
}

function formatBirthDateInput(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-");
    return `${day}/${month}/${year}`;
  }

  const digits = normalized.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function normalizeBirthDateForApi(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) {
    return undefined;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (!day || !month || !year || month > 12 || day > 31 || year < 1900) {
    return undefined;
  }

  const normalized = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const isSameDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;

  return isSameDate ? normalized : undefined;
}

function buildDocumentSuggestionSummary(suggestion: PersonDocumentOcrSuggestion) {
  const resolvedName = suggestion.prefill?.name ?? suggestion.nameCandidates?.[0] ?? suggestion.suggestedName;
  const resolvedDocument = suggestion.prefill?.document ?? suggestion.documentCandidates?.[0] ?? suggestion.suggestedDocument;
  const resolvedDocumentType = suggestion.prefill?.documentType ?? suggestion.suggestedDocumentType;
  const resolvedBirthDate = suggestion.prefill?.birthDate ?? suggestion.suggestedBirthDate;
  const parts = [
    resolvedName ? `Nome: ${resolvedName}` : null,
    resolvedDocument ? `Documento: ${resolvedDocument}` : null,
    resolvedDocumentType ? `Tipo: ${resolvedDocumentType}` : null,
    resolvedBirthDate ? `Nascimento: ${formatBirthDateInput(resolvedBirthDate)}` : null,
    typeof suggestion.confidence === "number" ? `Confiança: ${Math.round(suggestion.confidence * 100)}%` : null
  ].filter(Boolean);

  if (!parts.length) {
    return "O OCR leu o documento, mas não conseguiu sugerir dados suficientes para o cadastro.";
  }

  return `${parts.join(" • ")}.`;
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    gap: 14,
    padding: 16,
    paddingBottom: 160
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  help: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "justify"
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  progressCounter: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  progressRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  progressStep: {
    alignItems: "center",
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 132,
    padding: 10
  },
  progressStepDone: {
    backgroundColor: "#E8F1FB",
    borderColor: "#BBDDD3"
  },
  progressStepIndex: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "900"
  },
  progressStepIndexDone: {
    color: colors.primaryDark
  },
  progressStepLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "800"
  },
  progressStepLabelDone: {
    color: colors.primaryDark
  },
  sectionHeader: {
    gap: 4,
    marginTop: 4
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify"
  },
  orientationCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  orientationTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  orientationText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify"
  },
  checklistCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12
  },
  checklistTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  checklistItem: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  checklistDone: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10
  },
  summaryCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 84,
    padding: 10
  },
  summaryCardSuccess: {
    backgroundColor: "#F0F6FF",
    borderColor: "#C9DCF4"
  },
  summaryCardMuted: {
    backgroundColor: colors.surface,
    borderColor: colors.line
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center"
  },
  summaryValueMuted: {
    color: colors.muted
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center"
  },
  modeTabs: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4
  },
  modeTab: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    minHeight: 42,
    justifyContent: "center"
  },
  modeTabActive: {
    backgroundColor: "#E8F1FB"
  },
  modeTabDisabled: {
    opacity: 0.45
  },
  modeTabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  modeTabTextActive: {
    color: colors.primaryDark
  },
  searchRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10
  },
  searchInput: {
    flex: 1
  },
  searchButton: {
    minWidth: 96
  },
  peopleList: {
    gap: 10,
    minHeight: 94,
    paddingVertical: 2
  },
  verticalList: {
    gap: 10
  },
  person: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 12,
    width: 180
  },
  personVertical: {
    width: "100%"
  },
  personActive: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  personName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  personMeta: {
    color: colors.muted,
    fontSize: 13
  },
  personType: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  personFooter: {
    gap: 3
  },
  personStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  resultHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -4
  },
  loadingHint: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -4
  },
  photoLookupCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  photoLookupSummary: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10
  },
  photoLookupSummaryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  photoLookupSummaryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  matchHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  matchConfidence: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  matchForecastList: {
    gap: 8
  },
  matchForecastCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10
  },
  matchForecastTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900"
  },
  matchForecastMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  matchForecastActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  matchForecastAction: {
    backgroundColor: "#E8F1FB",
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  matchForecastActionDisabled: {
    opacity: 0.55
  },
  matchForecastActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  selectedCard: {
    backgroundColor: "#E8F1FB",
    borderColor: "#BBDDD3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  presenceActionsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  presenceActionsRow: {
    flexDirection: "row",
    gap: 10
  },
  presenceActionButton: {
    flex: 1
  },
  selectedHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  readOnlyCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  readOnlyTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  readOnlyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify"
  },
  selectedLabel: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  clearSelection: {
    paddingHorizontal: 2,
    paddingVertical: 2
  },
  clearSelectionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  selectedName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  selectedMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  selectedDetail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  attentionCard: {
    backgroundColor: "#FFF6EA",
    borderColor: "#F0D1A4",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  attentionTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "900"
  },
  attentionText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify"
  },
  summaryAccessCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  summaryAccessHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  summaryAccessTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  summaryAccessHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  summaryAccessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  miniStat: {
    alignItems: "center",
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 72,
    padding: 10
  },
  miniStatDanger: {
    backgroundColor: "#FCEEEE",
    borderColor: "#F3C8C5"
  },
  miniStatValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  miniStatValueDanger: {
    color: colors.danger
  },
  miniStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center"
  },
  summaryAccessText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify"
  },
  consent: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  consentText: {
    flex: 1,
    gap: 4
  },
  consentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  consentHelp: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "justify"
  },
  form: {
    gap: 12
  },
  infoCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  infoTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  infoText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify"
  },
  infoAction: {
    alignSelf: "flex-start",
    marginTop: 8
  },
  infoActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  infoActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  createActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  createActionButton: {
    minWidth: 148
  },
  linkAction: {
    paddingVertical: 2
  },
  linkActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipActive: {
    backgroundColor: "#E8F1FB",
    borderColor: colors.primary
  },
  chipDisabled: {
    opacity: 0.45
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  chipTextActive: {
    color: colors.primaryDark
  },
  documentTypeRow: {
    flexDirection: "row",
    gap: 8
  },
  docChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40
  },
  docChipActive: {
    backgroundColor: "#E8F1FB",
    borderColor: colors.primary
  },
  docChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  docChipTextActive: {
    color: colors.primaryDark
  },
  ruleHint: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700"
  },
  emptySearch: {
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 8
  }
});




