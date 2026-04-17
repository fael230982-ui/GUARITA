import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { apiClient } from "../api/client";
import { branding } from "../branding/config";
import { Button } from "../components/Button";
import { LabelCaptureModal } from "../components/LabelCaptureModal";
import { PhotoSlot } from "../components/PhotoSlot";
import { QrScannerModal } from "../components/QrScannerModal";
import { TextField } from "../components/TextField";
import { colors } from "../theme";
import { AuthSession, Delivery, DeliveryDraft, DeliveryLabelOcrResult, PersonSearchResult, PhotoAsset, Unit } from "../types";
import { buildOfflineAuditContext } from "../utils/audit";
import { enqueueOfflineOperation } from "../utils/offlineQueue";
import {
  displayDeliveryUnit,
  displayPersonUnit,
  displayUnitName,
  canShowDeliveryRenotify,
  getDeliveryWithdrawalQrCodeUrl,
  hasDeliveryWithdrawalData,
  isDeliveryAwaitingWithdrawal,
  isValidEmail,
  normalizeSearchText,
  personAttentionText,
  personCategoryText,
  personValidityText,
  sanitizeDocumentInput,
  statusText,
  sortPeopleByQuery,
  sortUnitsByQuery,
  withdrawalMethodText
} from "../utils/display";
import { canManageDeliveries, canValidateWithdrawals } from "../utils/permissions";
import { takePhoto } from "../utils/photo";
import { isUnitSelectionPending } from "../utils/sessionScope";
import { clearDeliveryDraft, loadDeliveryDraft, loadPeopleCache, saveDeliveryDraft, savePeopleCache } from "../utils/storage";

const emptyDraft: DeliveryDraft = {
  unitId: "",
  recipientName: "",
  recipientPersonId: "",
  deliveryCompany: "",
  trackingCode: ""
};

const DELIVERY_RECIPIENT_CATEGORIES = ["RESIDENT"] as const;

type DeliveryMode = "receive" | "deliver" | "query";
type ReceiveEntryMode = "manual" | "ocr";
type LookupFilter = "pending" | "withdrawn" | "all";

type Props = {
  session: AuthSession;
  isActive?: boolean;
  onCreated: (delivery: Delivery) => void;
  initialSearchQuery?: string;
  initialSearchVersion?: number;
  onDraftStateChange?: (hasDraft: boolean) => void;
};

export function DeliveryScreen({ session, isActive = true, onCreated, initialSearchQuery, initialSearchVersion, onDraftStateChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionOffsets = useRef({ unit: 0, recipient: 0, details: 0, lookupUnit: 0, withdrawal: 0 });
  const [mode, setMode] = useState<DeliveryMode>("receive");
  const [receiveEntryMode, setReceiveEntryMode] = useState<ReceiveEntryMode>("ocr");
  const [modeSelected, setModeSelected] = useState(Boolean(initialSearchQuery));
  const [showRecipientSearch, setShowRecipientSearch] = useState(Boolean(initialSearchQuery));
  const [draft, setDraft] = useState<DeliveryDraft>(emptyDraft);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [unitPeople, setUnitPeople] = useState<PersonSearchResult[]>([]);
  const [suggestedRecipientId, setSuggestedRecipientId] = useState<string | undefined>();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | undefined>();
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>();
  const [unitMismatchConfirmed, setUnitMismatchConfirmed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingUnitPeople, setLoadingUnitPeople] = useState(false);
  const [searchingUnits, setSearchingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingLabel, setReadingLabel] = useState(false);
  const [labelCaptureVisible, setLabelCaptureVisible] = useState(false);
  const [ocrResult, setOcrResult] = useState<DeliveryLabelOcrResult | undefined>();
  const [ocrStatus, setOcrStatus] = useState<string | undefined>();
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | undefined>();
  const [savedDraftAvailable, setSavedDraftAvailable] = useState<Awaited<ReturnType<typeof loadDeliveryDraft>> | undefined>();
  const [lookupUnitQuery, setLookupUnitQuery] = useState("");
  const [lookupUnits, setLookupUnits] = useState<Unit[]>([]);
  const [selectedLookupUnit, setSelectedLookupUnit] = useState<Unit | undefined>();
  const [lookupResults, setLookupResults] = useState<Delivery[]>([]);
  const [lookupFilter, setLookupFilter] = useState<LookupFilter>("pending");
  const [loadingLookupUnits, setLoadingLookupUnits] = useState(false);
  const [loadingLookupResults, setLoadingLookupResults] = useState(false);
  const [withdrawalCodes, setWithdrawalCodes] = useState<Record<string, string>>({});
  const [validatingDeliveryId, setValidatingDeliveryId] = useState<string | undefined>();
  const [renotifyingDeliveryId, setRenotifyingDeliveryId] = useState<string | undefined>();
  const [scannerDeliveryId, setScannerDeliveryId] = useState<string | undefined>();
  const [pendingDeliveryCount, setPendingDeliveryCount] = useState(0);
  const [pendingSummaryVisible, setPendingSummaryVisible] = useState(false);
  const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
  const [loadingPendingDeliveries, setLoadingPendingDeliveries] = useState(false);
  const [offlineNoticeDismissed, setOfflineNoticeDismissed] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const canRegisterDelivery = canManageDeliveries(session);
  const canValidateDelivery = canValidateWithdrawals(session);
  const lastSeedRef = useRef<string | undefined>(undefined);
  const canSearchRecipient = Boolean(canRegisterDelivery && selectedUnit?.id && recipientQuery.trim().length >= 2);
  const canSearchUnit = Boolean(canRegisterDelivery && unitQuery.trim().length >= 2);
  const canSearchLookupUnit = Boolean(lookupUnitQuery.trim().length >= 2);
  const selectedPersonEmailInvalid = Boolean(selectedPerson?.email && !isValidEmail(selectedPerson.email));
  const hasRecipientUnitMismatch = Boolean(
    selectedPerson?.unitId &&
      selectedUnit?.id &&
      selectedPerson.unitId !== selectedUnit.id
  );
  const canSubmitDelivery = Boolean(
    canRegisterDelivery &&
      draft.unitId &&
      draft.recipientName.trim() &&
      draft.deliveryCompany.trim() &&
      (!hasRecipientUnitMismatch || unitMismatchConfirmed)
  );
  const deliveryNextAction = getDeliveryNextAction({
    canRegisterDelivery,
    unitId: draft.unitId,
    recipientName: draft.recipientName,
    deliveryCompany: draft.deliveryCompany.trim(),
    labelPhoto: Boolean(draft.labelPhoto),
    packagePhoto: Boolean(draft.packagePhoto)
  });
  const visibleLookupResults = useMemo(() => {
    const filtered =
      lookupFilter === "pending"
        ? lookupResults.filter(isDeliveryAwaitingWithdrawal)
        : lookupFilter === "withdrawn"
          ? lookupResults.filter((item) => !isDeliveryAwaitingWithdrawal(item))
          : lookupResults;

    return filtered.sort(
      (left, right) =>
        new Date(right.receivedAt ?? right.createdAt ?? 0).getTime() -
        new Date(left.receivedAt ?? left.createdAt ?? 0).getTime()
    );
  }, [lookupFilter, lookupResults]);
  const visiblePendingDeliveries = useMemo(
    () =>
      pendingDeliveries
        .filter(isDeliveryAwaitingWithdrawal)
        .sort(
          (left, right) =>
            new Date(left.receivedAt ?? left.createdAt ?? 0).getTime() -
            new Date(right.receivedAt ?? right.createdAt ?? 0).getTime()
        ),
    [pendingDeliveries]
  );
  const orderedUnitPeople = useMemo(() => {
    if (!suggestedRecipientId) {
      return unitPeople;
    }

    return [...unitPeople].sort((left, right) => {
      if (left.id === suggestedRecipientId) {
        return -1;
      }
      if (right.id === suggestedRecipientId) {
        return 1;
      }
      return left.name.localeCompare(right.name, "pt-BR");
    });
  }, [suggestedRecipientId, unitPeople]);

  function patch(value: Partial<DeliveryDraft>) {
    setDraft((current) => ({ ...current, ...value }));
  }

  function startReceiveFlow(entryMode: ReceiveEntryMode) {
    const openNewReceive = () => {
      setMode("receive");
      setModeSelected(true);
      setReceiveEntryMode(entryMode);
      setLookupFilter("pending");

      if (entryMode === "ocr") {
        requestAnimationFrame(() => {
          void captureLabel();
        });
      }
    };

    const saved = savedDraftAvailable;
    if (saved && !isOlderThanHours(saved.updatedAt, 12)) {
      Alert.alert(
        "Rascunho encontrado",
        "Deseja continuar a encomenda em andamento ou começar uma nova?",
        [
          {
            text: "Nova encomenda",
            style: "destructive",
            onPress: () => {
              void clearDeliveryDraft();
              setSavedDraftAvailable(undefined);
              clearDraft();
              openNewReceive();
            }
          },
          {
            text: "Continuar rascunho",
            onPress: () => {
              applySavedDraft(saved);
              setMode("receive");
              setModeSelected(true);
            }
          }
        ]
      );
      return;
    }

    if (saved) {
      setSavedDraftAvailable(undefined);
      void clearDeliveryDraft();
    }

    clearDraft();
    openNewReceive();
  }

  function startLookupFlow(nextMode: "deliver" | "query") {
    Keyboard.dismiss();
    setMode(nextMode);
    setModeSelected(true);
    setLookupFilter(nextMode === "deliver" ? "pending" : "pending");
  }

  function applySavedDraft(saved: Awaited<ReturnType<typeof loadDeliveryDraft>>) {
    if (!saved) {
      return;
    }

    setMode("receive");
    setModeSelected(true);
    setReceiveEntryMode(saved.draft.labelPhoto ? "ocr" : "manual");
    setDraft(saved.draft);
    setRecipientQuery(saved.recipientQuery);
    setUnitQuery(saved.unitQuery);
    setSelectedPerson(saved.selectedPerson);
    setSelectedUnit(saved.selectedUnit);
    setUnitMismatchConfirmed(Boolean(saved.unitMismatchConfirmed));
    setShowRecipientSearch(Boolean(saved.recipientQuery.trim()) && !saved.selectedPerson);
    setDraftRestoredAt(saved.updatedAt);
    setSavedDraftAvailable(saved);
  }

  function isPersonLinkedToUnit(person: PersonSearchResult, unit: Unit) {
    const unitId = unit.id;
    if (person.unitId === unitId || person.unitIds?.includes(unitId)) {
      return true;
    }

    const unitTexts = [
      unit.id,
      unit.name,
      unit.nome,
      displayUnitName(unit),
      unit.blocoNome,
      unit.quadraNome,
      unit.ruaNome,
      unit.loteNome
    ]
      .filter(Boolean)
      .map((item) => normalizeSearchText(String(item)));

    const personTexts = [
      person.unitId,
      ...(person.unitIds ?? []),
      person.unitName,
      ...(person.unitNames ?? []),
      displayPersonUnit(person)
    ]
      .filter(Boolean)
      .map((item) => normalizeSearchText(String(item)));

    return personTexts.some((personText) => unitTexts.some((unitText) => unitText && personText.includes(unitText)));
  }

  function dedupePeople(list: PersonSearchResult[]) {
    return Array.from(new Map(list.map((item) => [item.id, item])).values());
  }

  function sortRecipientsForUnit(list: PersonSearchResult[]) {
    return [...list].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }

  function isDeliveryRecipient(person: PersonSearchResult) {
    const category = String(person.category ?? person.type ?? "").toUpperCase();
    return (
      category !== "VISITOR" &&
      category !== "VISITANTE" &&
      category !== "SERVICE_PROVIDER" &&
      category !== "PRESTADOR"
    );
  }

  function scrollToSection(section: keyof typeof sectionOffsets.current) {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(sectionOffsets.current[section] - 16, 0),
        animated: true
      });
    });
  }

  function scrollAfterKeyboard(y?: number, extraTop = 140) {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = setTimeout(() => {
      if (typeof y === "number") {
        scrollRef.current?.scrollTo({ y: Math.max(y - extraTop, 0), animated: true });
        return;
      }

      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === "ios" ? 180 : 260);
  }

  async function searchRecipient() {
    await executeRecipientSearch(recipientQuery);
  }

  async function executeRecipientSearch(value: string) {
    if (value.trim().length < 2) {
      Alert.alert("Busca", "Digite pelo menos 2 caracteres.");
      return;
    }

    try {
      setSearching(true);
      const result = sortPeopleByQuery(await apiClient.searchPeople(value.trim(), 80), value.trim()).filter(
        (item) => isDeliveryRecipient(item) && (!selectedUnit?.id || isPersonLinkedToUnit(item, selectedUnit))
      );
      setPeople(result);
      await savePeopleCache(result.slice(0, 200));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível buscar pessoas.";
      if (isOfflineError(message)) {
        const cached = await loadPeopleCache();
        const normalizedQuery = normalizeSearchText(value.trim());
        const fallback = (cached?.data ?? [])
          .filter((item) => isDeliveryRecipient(item) && (!selectedUnit?.id || isPersonLinkedToUnit(item, selectedUnit)))
          .filter((item) =>
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
        Alert.alert(
          "Busca offline",
          fallback.length
            ? "Sem conexão com o servidor. Mostrando pessoas encontradas no cache do aparelho."
            : "Sem conexão e sem pessoas salvas no aparelho para essa busca."
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

  async function findRecipientCandidates(value: string) {
    const text = value.trim();
    if (text.length < 2) {
      return [];
    }

    return sortPeopleByQuery((await apiClient.searchPeople(text, 80)).filter(isDeliveryRecipient), text);
  }

  function selectRecipient(person: PersonSearchResult) {
    Keyboard.dismiss();
    setSelectedPerson(person);
    setSuggestedRecipientId(undefined);
    setShowRecipientSearch(false);
    setUnitMismatchConfirmed(false);
    patch({
      recipientName: person.name,
      recipientPersonId: person.id,
      unitId: person.unitId ?? draft.unitId
    });
    if (person.unit) {
      setSelectedUnit(person.unit);
    }
    setRecipientQuery(person.name);
    if (person.unit) {
      setUnitQuery(displayUnitName(person.unit));
    }
    setPeople([]);
  }

  async function searchUnits(value?: string) {
    const text = (value ?? unitQuery).trim();
    if (text.length < 2) {
      Alert.alert("Unidades", "Digite pelo menos 2 caracteres.");
      return;
    }

    try {
      setSearchingUnits(true);
      const result = sortUnitsByQuery(await apiClient.searchUnits(text, 30), text);
      setUnits(result.slice(0, 30));
    } catch (error) {
      try {
        const allUnits = await apiClient.listUnits();
        const fallback = sortUnitsByQuery(allUnits, text).slice(0, 30);
        setUnits(fallback);
      } catch (fallbackError) {
        setUnits([]);
        Alert.alert("Unidades", fallbackError instanceof Error ? fallbackError.message : "Não foi possível buscar unidades.");
      }
    } finally {
      setSearchingUnits(false);
    }
  }

  async function findUnitCandidates(value: string) {
    const text = value.trim();
    if (text.length < 2) {
      return [];
    }

    try {
      return sortUnitsByQuery(await apiClient.searchUnits(text, 30), text).slice(0, 30);
    } catch {
      const allUnits = await apiClient.listUnits();
      return sortUnitsByQuery(allUnits, text).slice(0, 30);
    }
  }

  function selectUnit(unit: Unit) {
    Keyboard.dismiss();
    setSelectedUnit(unit);
    setSuggestedRecipientId(undefined);
    setShowRecipientSearch(false);
    setUnitMismatchConfirmed(false);
    setUnitPeople([]);
    if (selectedPerson && selectedPerson.unitId && selectedPerson.unitId !== unit.id) {
      setSelectedPerson(undefined);
      patch({
        recipientName: "",
        recipientPersonId: ""
      });
      setRecipientQuery("");
      setPeople([]);
    }
    patch({ unitId: unit.id });
    setUnitQuery(displayUnitName(unit));
    setUnits([]);
  }

  async function fetchRecipientsForUnit(unit: Unit) {
    const collected: PersonSearchResult[] = [];

    try {
      const residents = await apiClient.listUnitResidents(unit.id, session.selectedUnitId ?? null);
      if (residents.length) {
        collected.push(
          ...residents.map((item) => ({
            id: item.id,
            name: item.name,
            unitId: item.unitId,
            unitName: item.unitName ?? displayUnitName(unit),
            unit: {
              ...unit,
              name: item.unitName ?? unit.name
            },
            category: "RESIDENT",
            type: "MORADOR"
          }))
        );
      }
    } catch {
      // Keep fallback path while the new endpoint stabilizes across environments.
    }

    const primaryMatches = sortRecipientsForUnit(dedupePeople(collected)).slice(0, 20);
    if (primaryMatches.length) {
      return primaryMatches;
    }

    const categoryBatches = await Promise.all(
      DELIVERY_RECIPIENT_CATEGORIES.map(async (category) => {
        const matches: PersonSearchResult[] = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const response = await apiClient.listPeople({
            page: currentPage,
            limit: 100,
            category,
            status: "ACTIVE"
          });

          matches.push(
            ...response.data.filter((item) => isDeliveryRecipient(item) && isPersonLinkedToUnit(item, unit))
          );

          totalPages = response.meta.totalPages;
          currentPage += 1;
        } while (currentPage <= totalPages && currentPage <= 10 && matches.length < 20);

        return matches;
      })
    );

    const directMatches = sortRecipientsForUnit(dedupePeople(categoryBatches.flat())).slice(0, 20);
    if (directMatches.length) {
      return directMatches;
    }

    const searchTerms = dedupeTexts([
      unit.id,
      unit.nome,
      unit.name,
      displayUnitName(unit),
      [unit.blocoNome, unit.quadraNome, unit.loteNome].filter(Boolean).join(" ")
    ]);

    const fallbackBatches = await Promise.all(
      searchTerms.map(async (term) => {
        try {
          return await apiClient.searchPeople(term, 50);
        } catch {
          return [];
        }
      })
    );

    return sortRecipientsForUnit(
      dedupePeople(fallbackBatches.flat()).filter((item) => isDeliveryRecipient(item) && isPersonLinkedToUnit(item, unit))
    ).slice(0, 20);
  }

  async function loadPeopleForSelectedUnit(unit: Unit) {
    try {
      setLoadingUnitPeople(true);
      setUnitPeople(await fetchRecipientsForUnit(unit));
    } catch {
      setUnitPeople([]);
    } finally {
      setLoadingUnitPeople(false);
    }
  }

  async function capturePackage() {
    try {
      const photo = await takePhoto("volume");
      if (photo) {
        patch({ packagePhoto: photo });
      }
    } catch (error) {
      Alert.alert("Câmera", error instanceof Error ? error.message : "Não foi possível abrir a câmera.");
    }
  }

  function captureLabel() {
    setLabelCaptureVisible(true);
  }

  function handleLabelCaptured(photo: PhotoAsset) {
    patch({ labelPhoto: photo });
    setOcrResult(undefined);
    setOcrStatus(undefined);
    void readLabel(photo);
  }

  async function readLabel(labelPhoto = draft.labelPhoto) {
    if (!labelPhoto) {
      Alert.alert("Etiqueta", "Fotografe a etiqueta antes de iniciar a leitura.");
      return;
    }

    try {
      setReadingLabel(true);
      setOcrStatus(undefined);
      const result = await apiClient.readDeliveryLabel(labelPhoto as PhotoAsset);
      setOcrResult(result);

      const trackingCode = result.suggestions?.trackingCode ?? result.trackingCodeCandidates?.[0];
      const deliveryCompany = result.suggestions?.deliveryCompany ?? result.carrierHint;
      const recipientName = result.suggestions?.recipientName;
      const nextStatus: string[] = [];
      const unitSuggestionLabel = result.suggestions?.unitName ?? result.unitHint ?? extractUnitHintsFromOcr(result)[0];

      patch({
        recipientName: recipientName || draft.recipientName,
        deliveryCompany: deliveryCompany || draft.deliveryCompany,
        trackingCode: trackingCode || draft.trackingCode
      });

      const matchedUnit = await tryAutoSelectUnitFromOcr(result);
      if (matchedUnit) {
        nextStatus.push(`unidade vinculada: ${displayUnitName(matchedUnit)}`);
        if (unitSuggestionLabel && normalizeSearchText(unitSuggestionLabel) !== normalizeSearchText(displayUnitName(matchedUnit))) {
          nextStatus.push(`etiqueta sugeriu: ${unitSuggestionLabel}`);
        }
      } else if (result.suggestions?.unitName || result.unitHint || result.suggestions?.recipientUnitId) {
        nextStatus.push("unidade sugerida para conferência manual");
      }

      if ((recipientName || result.suggestions?.recipientPersonId || matchedUnit) && !selectedPerson) {
        const matchedPerson = await tryAutoSelectRecipientFromOcr(result, matchedUnit);
        if (matchedPerson) {
          nextStatus.push(`destinatário vinculado: ${matchedPerson.name}`);
        } else {
          nextStatus.push("destinatário sugerido para conferência");
        }
      }

      const applied: string[] = [];
      if (recipientName) applied.push("destinatário");
      if (deliveryCompany) applied.push("transportadora");
      if (trackingCode) applied.push("código de rastreio");
      if (result.suggestions?.unitName || result.unitHint || result.suggestions?.recipientUnitId) applied.push("unidade");
      applied.push(...nextStatus);

      setOcrStatus(
        applied.length
          ? `OCR aplicado: ${applied.join(", ")}.`
          : "OCR concluído."
      );
      requestAnimationFrame(() => {
        scrollToSection("unit");
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível ler a etiqueta.";
      setOcrStatus(undefined);
      Alert.alert(
        "OCR da etiqueta",
        isOfflineError(message)
          ? "Sem conexão para ler a etiqueta agora. Continue no preenchimento manual da encomenda."
          : message
      );
    } finally {
      setReadingLabel(false);
    }
  }

  async function submit() {
    setSubmitAttempted(true);

    if (!draft.unitId) {
      Alert.alert("Conferência", "Selecione a unidade pela busca antes de salvar.");
      return;
    }

    if (!draft.recipientName.trim()) {
      Alert.alert("Conferência", "Confirme o destinatário antes de salvar a encomenda.");
      return;
    }

    if (!draft.deliveryCompany.trim()) {
      Alert.alert("Conferência", "Informe a transportadora para concluir o recebimento.");
      return;
    }

    if (hasRecipientUnitMismatch && !unitMismatchConfirmed) {
      Alert.alert("Conferência", "Confirme a unidade diferente do cadastro da pessoa antes de salvar a encomenda.");
      return;
    }

    const nextDraft = {
      ...draft,
      clientRequestId: draft.clientRequestId ?? `guard-app-delivery-${Date.now()}`
    };

    try {
      setSaving(true);
      patch({ clientRequestId: nextDraft.clientRequestId });
      const delivery = await apiClient.createDelivery(
        {
          ...nextDraft,
          recipientName: nextDraft.recipientName.trim(),
          deliveryCompany: nextDraft.deliveryCompany.trim()
        },
        session.operatorId
      );
      finishCreation({ ...delivery, createdAt: delivery.receivedAt ?? new Date().toISOString() });
      Alert.alert("Encomenda cadastrada", "Encomenda registrada com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";

      if (isOfflineError(message)) {
        const queuedDelivery = buildQueuedDelivery(nextDraft, selectedUnit);
        await enqueueOfflineOperation({
          id: queuedDelivery.id,
          type: "createDelivery",
          createdAt: queuedDelivery.createdAt ?? new Date().toISOString(),
          payload: {
            draft: nextDraft,
            receivedBy: session.operatorId,
            audit: buildOfflineAuditContext({
              session,
              unitId: nextDraft.unitId,
              evidenceUrl: nextDraft.packagePhoto?.uri ?? nextDraft.labelPhoto?.uri ?? null
            })
          }
        });
        finishCreation(queuedDelivery);
        Alert.alert("Sem conexão", "A encomenda foi salva no aparelho e será enviada quando a internet voltar.");
      } else {
        const recoveredDelivery = await tryRecoverDeliveryAfterError(nextDraft, selectedUnit);
        if (recoveredDelivery) {
          finishCreation(recoveredDelivery);
          Alert.alert("Encomenda cadastrada", "Encomenda registrada com sucesso.");
          return;
        }
        Alert.alert("Falha ao cadastrar", message);
      }
    } finally {
      setSaving(false);
    }
  }

  function finishCreation(delivery: Delivery) {
    onCreated(delivery);
    if (isDeliveryAwaitingWithdrawal(delivery)) {
      setPendingDeliveryCount((current) => current + 1);
      if (pendingSummaryVisible) {
        setPendingDeliveries((current) =>
          [delivery, ...current].sort(
            (left, right) =>
              new Date(left.receivedAt ?? left.createdAt ?? 0).getTime() -
              new Date(right.receivedAt ?? right.createdAt ?? 0).getTime()
          )
        );
      }
    }
    clearDraft();
  }

  function clearDraft() {
    setDraft(emptyDraft);
    setSubmitAttempted(false);
    setShowRecipientSearch(false);
    setSelectedPerson(undefined);
    setSelectedUnit(undefined);
    setSuggestedRecipientId(undefined);
    setPeople([]);
    setUnitPeople([]);
    setUnits([]);
    setOcrResult(undefined);
    setOcrStatus(undefined);
    setRecipientQuery("");
    setUnitQuery("");
    setUnitMismatchConfirmed(false);
    setDraftRestoredAt(undefined);
    void clearDeliveryDraft();
  }

  async function tryRecoverDeliveryAfterError(draftToRecover: DeliveryDraft, unit?: Unit) {
    const normalized = draftToRecover.clientRequestId?.trim() ?? "";
    if (!normalized) {
      return undefined;
    }

    try {
      const reconciliation = await apiClient.reconcileSyncRequest(normalized);
      if (reconciliation.found && reconciliation.isApplied) {
        const deliveries = await apiClient.listDeliveries();
        const recovered = deliveries.find(
          (item) => item.clientRequestId?.trim() === normalized || (reconciliation.aggregateId && item.id === reconciliation.aggregateId)
        );
        if (recovered) {
          return recovered;
        }
      }
    } catch {
      // Fall through to direct lookup, because the backend may have persisted
      // the delivery even if reconcile is temporarily unavailable.
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const deliveries = await apiClient.listDeliveries();
        const recovered =
          deliveries.find((item) => item.clientRequestId?.trim() === normalized) ??
          deliveries.find((item) => isLikelyRecoveredDelivery(item, draftToRecover, unit));

        if (recovered) {
          return recovered;
        }
      } catch {
        // Ignore lookup failures during recovery loop.
      }

      await wait(700);
    }

    return undefined;
  }

  async function searchLookupUnits(value?: string) {
    const text = (value ?? lookupUnitQuery).trim();
    if (text.length < 2) {
      Alert.alert("Unidades", "Digite pelo menos 2 caracteres.");
      return;
    }

    try {
      setLoadingLookupUnits(true);
      const result = sortUnitsByQuery(await apiClient.searchUnits(text, 30), text);
      setLookupUnits(result.slice(0, 30));
    } catch {
      try {
        const allUnits = await apiClient.listUnits();
        setLookupUnits(sortUnitsByQuery(allUnits, text).slice(0, 30));
      } catch (error) {
        setLookupUnits([]);
        Alert.alert("Unidades", error instanceof Error ? error.message : "Não foi possível buscar unidades.");
      }
    } finally {
      setLoadingLookupUnits(false);
    }
  }

  function selectLookupUnit(unit: Unit) {
    Keyboard.dismiss();
    setSelectedLookupUnit(unit);
    setLookupUnitQuery(displayUnitName(unit));
    setLookupUnits([]);
    setLookupResults([]);
    setLookupFilter("pending");
  }

  async function loadLookupDeliveries(unit = selectedLookupUnit) {
    if (!unit?.id) {
      Alert.alert("Consulta", "Selecione a unidade antes de consultar as encomendas.");
      return;
    }

    try {
      setLoadingLookupResults(true);
      const result = await apiClient.listDeliveries();
      const filtered = result
        .filter((item) => item.recipientUnitId === unit.id || displayDeliveryUnit(item).toLowerCase() === displayUnitName(unit).toLowerCase())
        .sort((left, right) => new Date(right.receivedAt ?? right.createdAt ?? 0).getTime() - new Date(left.receivedAt ?? left.createdAt ?? 0).getTime());
      setLookupResults(filtered);
    } catch (error) {
      Alert.alert("Consulta", error instanceof Error ? error.message : "Não foi possível consultar as encomendas.");
    } finally {
      setLoadingLookupResults(false);
    }
  }

  async function refreshPendingDeliveriesCount() {
    try {
      const result = await apiClient.listDeliveries();
      const pending = result.filter(isDeliveryAwaitingWithdrawal);
      setPendingDeliveryCount(pending.length);
      if (pendingSummaryVisible) {
        setPendingDeliveries(pending);
      }
    } catch {
      setPendingDeliveryCount(0);
      if (pendingSummaryVisible) {
        setPendingDeliveries([]);
      }
    }
  }

  async function togglePendingSummary() {
    const nextVisible = !pendingSummaryVisible;
    setPendingSummaryVisible(nextVisible);

    if (!nextVisible) {
      return;
    }

    try {
      setLoadingPendingDeliveries(true);
      const result = await apiClient.listDeliveries();
      const pending = result.filter(isDeliveryAwaitingWithdrawal);
      setPendingDeliveries(pending);
      setPendingDeliveryCount(pending.length);
    } catch (error) {
      setPendingDeliveries([]);
      Alert.alert("Na portaria", error instanceof Error ? error.message : "Não foi possível consultar as encomendas na portaria.");
    } finally {
      setLoadingPendingDeliveries(false);
    }
  }

  async function validateLookupDelivery(item: Delivery, manualConfirmation?: boolean, scannedCode?: string) {
    try {
      setValidatingDeliveryId(item.id);
      const response = await apiClient.validateDeliveryWithdrawal(item.id, scannedCode ?? withdrawalCodes[item.id], manualConfirmation);
      if (!response.valid) {
        Alert.alert("Entrega", response.message ?? "Código inválido.");
        return;
      }

      setLookupResults((current) =>
        current.map((delivery) =>
          delivery.id === item.id
            ? {
                ...delivery,
                status: response.status ?? "WITHDRAWN",
                withdrawnAt: response.withdrawnAt ?? delivery.withdrawnAt ?? new Date().toISOString(),
                withdrawnBy: response.withdrawnBy ?? delivery.withdrawnBy,
                withdrawnByName: response.withdrawnByName ?? delivery.withdrawnByName,
                withdrawalValidatedAt: response.withdrawalValidatedAt ?? delivery.withdrawalValidatedAt ?? new Date().toISOString(),
                withdrawalValidatedByUserId: response.withdrawalValidatedByUserId ?? delivery.withdrawalValidatedByUserId,
                withdrawalValidatedByUserName: response.withdrawalValidatedByUserName ?? delivery.withdrawalValidatedByUserName,
                withdrawalValidationMethod: response.withdrawalValidationMethod ?? delivery.withdrawalValidationMethod,
                withdrawalFailureReason: response.withdrawalFailureReason ?? null
              }
            : delivery
        )
      );
      setWithdrawalCodes((current) => ({ ...current, [item.id]: "" }));
      setPendingDeliveryCount((current) => Math.max(current - 1, 0));
      if (pendingSummaryVisible) {
        setPendingDeliveries((current) => current.filter((delivery) => delivery.id !== item.id));
      }
      Alert.alert("Entrega concluída", response.message ?? "Encomenda liberada com sucesso.");
    } catch (error) {
      Alert.alert("Entrega", error instanceof Error ? error.message : "Não foi possível validar a entrega.");
    } finally {
      setValidatingDeliveryId(undefined);
      setScannerDeliveryId(undefined);
    }
  }

  async function renotifyLookupDelivery(item: Delivery) {
    try {
      setRenotifyingDeliveryId(item.id);
      const response = await apiClient.renotifyDelivery(item.id);
      setLookupResults((current) =>
        current.map((delivery) =>
          delivery.id === item.id
            ? {
                ...delivery,
                notificationSentAt: response.notificationSentAt ?? delivery.notificationSentAt
              }
            : delivery
        )
      );
      if (pendingSummaryVisible) {
        setPendingDeliveries((current) =>
          current.map((delivery) =>
            delivery.id === item.id
              ? {
                  ...delivery,
                  notificationSentAt: response.notificationSentAt ?? delivery.notificationSentAt
                }
              : delivery
          )
        );
      }
      Alert.alert(
        "Notificação reenviada",
        `${response.notifiedUsersCount} morador${response.notifiedUsersCount === 1 ? "" : "es"} notificado${response.notifiedUsersCount === 1 ? "" : "s"}.`
      );
    } catch (error) {
      Alert.alert("Notificação", error instanceof Error ? error.message : "Não foi possível reenviar a notificação.");
    } finally {
      setRenotifyingDeliveryId(undefined);
    }
  }

  function clearRecipientSelection() {
    setSelectedPerson(undefined);
    setSuggestedRecipientId(undefined);
    setPeople([]);
    setRecipientQuery("");
    setUnitMismatchConfirmed(false);
    patch({
      recipientName: "",
      recipientPersonId: ""
    });
  }

  function clearUnitSelection() {
    setSelectedUnit(undefined);
    setSuggestedRecipientId(undefined);
    setUnits([]);
    setUnitQuery("");
    setUnitMismatchConfirmed(false);
    patch({ unitId: "" });
  }

  async function tryAutoSelectRecipient(value: string, unit?: Unit) {
    const candidates = (await findRecipientCandidates(value)).filter((item) =>
      unit ? isPersonLinkedToUnit(item, unit) : true
    );
    setPeople(candidates);

    const exactMatches = candidates.filter((item) => isStrongPersonMatch(item, value));
    const match = exactMatches[0];
    if (exactMatches.length === 1 && match) {
      selectRecipient(match);
      return match;
    }

    const singleCandidate = candidates[0];
    if (candidates.length === 1 && singleCandidate) {
      selectRecipient(singleCandidate);
      return singleCandidate;
    }

    const fuzzyMatch = findBestRecipientCandidate(candidates, value);
    if (fuzzyMatch) {
      selectRecipient(fuzzyMatch);
      return fuzzyMatch;
    }

    return undefined;
  }

  async function findUnitById(unitId: string) {
    const normalizedId = unitId.trim();
    if (!normalizedId) {
      return undefined;
    }

    try {
      const allUnits = await apiClient.listUnits();
      return allUnits.find((item) => item.id === normalizedId);
    } catch {
      return undefined;
    }
  }

  async function resolveUnitFromPerson(person: PersonSearchResult) {
    if (person.unit) {
      return person.unit;
    }

    if (person.unitId) {
      return findUnitById(person.unitId);
    }

    const fallbackUnitName = person.unitName ?? person.unitNames?.[0];
    if (fallbackUnitName) {
      return tryAutoSelectUnit(fallbackUnitName);
    }

    return undefined;
  }

  async function tryAutoSelectUnitFromOcr(result: DeliveryLabelOcrResult) {
    const confidence = result.confidence ?? 0;
    const unitById = result.suggestions?.recipientUnitId ? await findUnitById(result.suggestions.recipientUnitId) : undefined;
    if (unitById) {
      selectUnit(unitById);
      return unitById;
    }

    const unitCandidates = dedupeTexts([
      ...extractUnitSuggestionsFromOcr(result),
      result.suggestions?.unitName ?? undefined,
      result.unitHint ?? undefined,
      ...extractUnitHintsFromOcr(result)
    ]);

    for (const unitCandidate of unitCandidates) {
      setUnitQuery(unitCandidate);
      const matched = await tryAutoSelectUnit(unitCandidate);
      if (matched) {
        return matched;
      }
    }

    const firstCandidate = unitCandidates[0];
    if (firstCandidate) {
      setUnitQuery(firstCandidate);
    }

    return undefined;
  }

  async function tryAutoSelectRecipientFromOcr(result: DeliveryLabelOcrResult, unit?: Unit) {
    const confidence = result.confidence ?? 0;
    const recipientPersonId = result.suggestions?.recipientPersonId;
    const recipientName = result.suggestions?.recipientName;

    if (unit) {
      const unitRecipients = await fetchRecipientsForUnit(unit);
      setUnitPeople(unitRecipients);

      const singleUnitRecipient = unitRecipients[0];
      if (confidence >= 0.82 && unitRecipients.length === 1 && singleUnitRecipient) {
        selectRecipient(singleUnitRecipient);
        return singleUnitRecipient;
      }

      if (recipientPersonId) {
        const exactById = unitRecipients.find((item) => item.id === recipientPersonId);
        if (exactById) {
          selectRecipient(exactById);
          return exactById;
        }
      }

      const residentSuggestion = result.residentSuggestions?.[0];
      if (residentSuggestion) {
        const bySuggestedId = unitRecipients.find((item) => item.id === residentSuggestion.id);
        if (bySuggestedId && confidence >= 0.72) {
          selectRecipient(bySuggestedId);
          return bySuggestedId;
        }
        if (bySuggestedId) {
          setSuggestedRecipientId(bySuggestedId.id);
          setRecipientQuery(bySuggestedId.name);
          setOcrStatus((current) => appendOcrStatus(current, `destinatário sugerido: ${bySuggestedId.name}`));
          return undefined;
        }
      }

      const recipientHints = dedupeTexts([
        recipientName ?? undefined,
        extractRecipientCandidateTextFromOcr(result),
        ...extractResidentSuggestionsFromOcr(result),
        ...extractRecipientHintsFromOcr(result)
      ]);

      for (const hint of recipientHints) {
        const exactByName = unitRecipients.find((item) => isStrongPersonMatch(item, hint));
        if (exactByName) {
          selectRecipient(exactByName);
          return exactByName;
        }

        const fuzzyByName = findBestRecipientCandidate(unitRecipients, hint);
        if (fuzzyByName && confidence >= 0.8) {
          selectRecipient(fuzzyByName);
          return fuzzyByName;
        }
      }

      const suggestedByHint = findSuggestedRecipientCandidate(unitRecipients, [
        ...recipientHints,
        result.rawText ?? "",
        result.normalizedText ?? ""
      ]);
      if (suggestedByHint) {
        setSuggestedRecipientId(suggestedByHint.id);
        setRecipientQuery(suggestedByHint.name);
        setOcrStatus((current) => appendOcrStatus(current, `destinatário sugerido: ${suggestedByHint.name}`));
        return undefined;
      }

      const fuzzyFromFullText = findBestRecipientCandidateInText(unitRecipients, [
        result.rawText ?? "",
        result.normalizedText ?? "",
        extractRecipientCandidateTextFromOcr(result) ?? ""
      ].join(" "));
      if (fuzzyFromFullText) {
        setSuggestedRecipientId(fuzzyFromFullText.id);
        setRecipientQuery(fuzzyFromFullText.name);
        setOcrStatus((current) => appendOcrStatus(current, `destinatário sugerido: ${fuzzyFromFullText.name}`));
        return undefined;
      }

      const fallbackSuggestion = confidence >= 0.65 ? unitRecipients[0] : undefined;
      if (fallbackSuggestion) {
        setSuggestedRecipientId(fallbackSuggestion.id);
        setRecipientQuery(fallbackSuggestion.name);
        setOcrStatus((current) => appendOcrStatus(current, `destinatário sugerido: ${fallbackSuggestion.name}`));
      }
    }

    if (recipientName) {
      setRecipientQuery(recipientName);
      const matched = await tryAutoSelectRecipient(recipientName, unit);
      if (matched && !unit) {
        const matchedUnit = await resolveUnitFromPerson(matched);
        if (matchedUnit) {
          selectUnit(matchedUnit);
        }
      }
      return matched;
    }

    return undefined;
  }

  async function tryAutoSelectUnit(value: string) {
    const attempts = expandUnitLookupTerms(value);
    const allowSingleCandidate = (ocrResult?.confidence ?? 0) >= 0.82;

    for (const attempt of attempts) {
      const candidates = await findUnitCandidates(attempt);
      setUnits(candidates);

      const exactMatches = candidates.filter((item) => isStrongUnitMatch(item, attempt));
      const match = exactMatches[0];
      if (exactMatches.length === 1 && match) {
        selectUnit(match);
        return match;
      }

      const singleCandidate = candidates[0];
      if (allowSingleCandidate && candidates.length === 1 && singleCandidate) {
        selectUnit(singleCandidate);
        return singleCandidate;
      }
    }

    return undefined;
  }

  useEffect(() => {
    const seedKey = `${initialSearchVersion ?? 0}:${initialSearchQuery ?? ""}`;
    if (!initialSearchQuery || seedKey === lastSeedRef.current) {
      return;
    }

    lastSeedRef.current = seedKey;
    setMode("query");
    setModeSelected(true);
    setLookupUnitQuery(initialSearchQuery);
    setSelectedLookupUnit(undefined);
    setLookupResults([]);
    void searchLookupUnits(initialSearchQuery);
  }, [initialSearchQuery, initialSearchVersion]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    async function hydrateDraft() {
      const saved = await loadDeliveryDraft();
      if (saved && saved.operatorId && saved.operatorId !== session.operatorId) {
        await clearDeliveryDraft();
        setSavedDraftAvailable(undefined);
        setDraftHydrated(true);
        return;
      }

      if (saved && !isOlderThanHours(saved.updatedAt, 12)) {
        setSavedDraftAvailable(saved);
      } else if (saved) {
        await clearDeliveryDraft();
        setSavedDraftAvailable(undefined);
      }

      setDraftHydrated(true);
    }

    void hydrateDraft();
  }, [isActive, session.operatorId]);

  useEffect(() => {
    if (!draftHydrated) {
      return;
    }

    const hasContent =
      Boolean(draft.unitId) ||
      Boolean(draft.recipientName.trim()) ||
      Boolean(draft.deliveryCompany.trim()) ||
      Boolean(draft.trackingCode.trim()) ||
      Boolean(draft.labelPhoto) ||
      Boolean(draft.packagePhoto) ||
      Boolean(recipientQuery.trim()) ||
      Boolean(unitQuery.trim()) ||
      Boolean(selectedPerson) ||
      Boolean(selectedUnit);

    onDraftStateChange?.(hasContent);

    if (!hasContent) {
      void clearDeliveryDraft();
      return;
    }

    void saveDeliveryDraft({
      operatorId: session.operatorId,
      draft,
      recipientQuery,
      unitQuery,
      selectedPerson,
      selectedUnit,
      unitMismatchConfirmed,
      updatedAt: new Date().toISOString()
    });
  }, [draft, draftHydrated, onDraftStateChange, recipientQuery, selectedPerson, selectedUnit, session.operatorId, unitMismatchConfirmed, unitQuery]);

  useEffect(() => {
    if (!recipientQuery.trim()) {
      setPeople([]);
    }
  }, [recipientQuery]);

  useEffect(() => {
    setSubmitAttempted(false);
  }, [mode, modeSelected]);

  useEffect(() => {
    if (!modeSelected || mode !== "receive" || !selectedUnit) {
      return;
    }

    const normalized = recipientQuery.trim();
    if (normalized.length < 2) {
      setPeople([]);
      return;
    }

    if (selectedPerson && normalizeSearchText(selectedPerson.name) !== normalizeSearchText(normalized)) {
      setSelectedPerson(undefined);
      patch({ recipientName: "", recipientPersonId: "" });
    }

    const timer = setTimeout(() => {
      void executeRecipientSearch(normalized);
    }, 250);

    return () => clearTimeout(timer);
  }, [mode, modeSelected, recipientQuery, selectedPerson?.id, selectedUnit?.id]);

  useEffect(() => {
    if (!unitQuery.trim()) {
      setUnits([]);
      if (!selectedUnit) {
        return;
      }
    }
  }, [unitQuery]);

  useEffect(() => {
    if (!modeSelected || mode !== "receive") {
      return;
    }

    const normalized = unitQuery.trim();
    if (normalized.length < 2) {
      setUnits([]);
      return;
    }

    if (selectedUnit && displayUnitName(selectedUnit).toLowerCase() !== normalized.toLowerCase()) {
      setSelectedUnit(undefined);
      setPeople([]);
      setUnitPeople([]);
      patch({ unitId: "", recipientName: "", recipientPersonId: "" });
    }

    const timer = setTimeout(() => {
      void searchUnits(normalized);
    }, 250);

    return () => clearTimeout(timer);
  }, [mode, modeSelected, selectedUnit?.id, unitQuery]);

  useEffect(() => {
    if (!selectedUnit) {
      setUnitPeople([]);
      return;
    }

    void loadPeopleForSelectedUnit(selectedUnit);
  }, [selectedUnit?.id]);

  useEffect(() => {
    if (!lookupUnitQuery.trim()) {
      setLookupUnits([]);
      setSelectedLookupUnit(undefined);
    }
  }, [lookupUnitQuery]);

  useEffect(() => {
    if (!modeSelected || (mode !== "deliver" && mode !== "query")) {
      return;
    }

    const normalized = lookupUnitQuery.trim();
    if (normalized.length < 2) {
      setLookupUnits([]);
      return;
    }

    if (selectedLookupUnit && displayUnitName(selectedLookupUnit).toLowerCase() !== normalized.toLowerCase()) {
      setSelectedLookupUnit(undefined);
      setLookupResults([]);
    }

    const timer = setTimeout(() => {
      void searchLookupUnits(normalized);
    }, 250);

    return () => clearTimeout(timer);
  }, [lookupUnitQuery, mode, modeSelected, selectedLookupUnit?.id]);

  useEffect(() => {
    void refreshPendingDeliveriesCount();
  }, []);

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

  useEffect(() => {
    setOfflineNoticeDismissed(false);
  }, [modeSelected, mode]);

  useEffect(() => {
    if (!selectedLookupUnit || (mode !== "deliver" && mode !== "query")) {
      return;
    }

    void loadLookupDeliveries(selectedLookupUnit);
  }, [mode, selectedLookupUnit?.id]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0} style={{ flex: 1 }}>
    <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: 160 + keyboardInset }]} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="always">
      <LabelCaptureModal
        visible={labelCaptureVisible}
        onClose={() => setLabelCaptureVisible(false)}
        onConfirm={handleLabelCaptured}
        onManualEntry={() => {
          setLabelCaptureVisible(false);
          setReceiveEntryMode("manual");
        }}
      />
      <Text style={styles.help}>Receber, entregar ou consultar encomendas com poucos passos.</Text>
      {!modeSelected ? (
        <View style={styles.actionChooser}>
          <Text style={styles.actionChooserTitle}>O que você vai fazer agora?</Text>
          {pendingDeliveryCount ? (
            <Pressable onPress={() => { void togglePendingSummary(); }} style={styles.inlineInfoCard}>
              <View style={styles.selectedHead}>
                <Text style={styles.inlineInfoTitle}>Na portaria</Text>
                <Text style={styles.linkActionText}>{pendingSummaryVisible ? "Ocultar resumo" : "Ver resumo"}</Text>
              </View>
              <Text style={styles.inlineInfoText}>{pendingDeliveryCount} encomenda{pendingDeliveryCount === 1 ? "" : "s"} aguardando retirada.</Text>
            </Pressable>
          ) : null}
          {pendingSummaryVisible ? (
            <View style={styles.listSection}>
              {loadingPendingDeliveries ? <Text style={styles.loadingHint}>Carregando resumo da portaria...</Text> : null}
              {!loadingPendingDeliveries && !visiblePendingDeliveries.length ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>Não há encomendas aguardando retirada neste momento.</Text>
                </View>
              ) : null}
              {visiblePendingDeliveries.map((item) => (
                <View key={`pending-${item.id}`} style={styles.selectedCard}>
                  <View style={styles.selectedHead}>
                    <Text style={styles.selectedName}>{item.deliveryCompany || "Encomenda"}</Text>
                    <Text style={styles.badgeSmall}>{formatPendingDaysLabel(item.receivedAt ?? item.createdAt)}</Text>
                  </View>
                  <Text style={styles.selectedDetail}>Recebida na portaria: {formatDateTime(item.receivedAt ?? item.createdAt ?? new Date().toISOString())}</Text>
                  <Text style={styles.selectedDetail}>
                    Destinatário: {item.recipientPersonId ? "Destinatário identificado" : "Destinatário não informado"}
                  </Text>
                  <Text style={styles.selectedDetail}>
                    {item.notificationSentAt ? `Notificação enviada em ${formatDateTime(item.notificationSentAt)}` : "Notificação ainda não enviada"}
                  </Text>
                  {canShowDeliveryRenotify(item, session) ? (
                    <View style={styles.summaryActionRow}>
                      <Button
                        compact
                        variant="secondary"
                        loading={renotifyingDeliveryId === item.id}
                        onPress={() => {
                          void renotifyLookupDelivery(item);
                        }}
                      >
                        Reenviar notificação
                      </Button>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          <Pressable onPress={() => startReceiveFlow(branding.features.deliveryOcr ? "ocr" : "manual")} style={[styles.actionCard, styles.actionCardReceive]}>
            <Text style={styles.actionCardTitle}>{branding.labels.receiveDelivery}</Text>
            <Text style={styles.actionCardText}>Abrir a leitura da etiqueta, conferir a seleção e salvar.</Text>
          </Pressable>
          <Pressable onPress={() => startLookupFlow("deliver")} style={[styles.actionCard, styles.actionCardDeliver]}>
            <Text style={styles.actionCardTitle}>{branding.labels.deliverDelivery}</Text>
            <Text style={styles.actionCardText}>
              {pendingDeliveryCount
                ? `${pendingDeliveryCount} aguardando retirada. Selecionar unidade, localizar a encomenda e validar.`
                : "Selecionar unidade, localizar a encomenda e validar a retirada."}
            </Text>
          </Pressable>
          <Pressable onPress={() => startLookupFlow("query")} style={[styles.actionCard, styles.actionCardQuery]}>
            <Text style={styles.actionCardTitle}>{branding.labels.deliveryQuery}</Text>
            <Text style={styles.actionCardText}>
              {pendingDeliveryCount
                ? `Consultar rápido e apoiar ${pendingDeliveryCount} pendente${pendingDeliveryCount === 1 ? "" : "s"}.`
                : "Consultar rapidamente as encomendas de uma unidade e entregar se precisar."}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.modeSelectorBar}>
          <Text style={styles.modeSelectorText}>{mode === "receive" ? branding.labels.receiveDelivery : mode === "deliver" ? branding.labels.deliverDelivery : branding.labels.deliveryQuery}</Text>
          <View style={styles.modeSelectorActions}>
            {mode === "receive" ? (
              <>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setModeSelected(false);
                  }}
                  style={[styles.linkAction, styles.topAction]}
                >
                  <Text style={styles.linkActionText}>Voltar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setReceiveEntryMode(receiveEntryMode === "ocr" ? "manual" : "ocr");
                  }}
                  style={[styles.linkAction, styles.topAction]}
                >
                  <Text style={styles.linkActionText}>
                    {receiveEntryMode === "ocr" ? "Digitar manualmente" : branding.labels.readLabel}
                  </Text>
                </Pressable>
              </>
            ) : null}
            {mode !== "receive" ? (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setModeSelected(false);
                }}
                style={[styles.linkAction, styles.topAction]}
              >
                <Text style={styles.linkActionText}>Voltar</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
      {modeSelected && mode === "receive" ? (
        <>
      {draftRestoredAt ? (
        <View style={styles.inlineInfoCard}>
          <View style={styles.selectedHead}>
            <Text style={styles.inlineInfoTitle}>Rascunho recuperado</Text>
            <View style={styles.infoActions}>
              <Pressable onPress={() => setDraftRestoredAt(undefined)} style={styles.clearSelection}>
                <Text style={styles.clearSelectionText}>Ocultar</Text>
              </Pressable>
              <Pressable onPress={clearDraft} style={styles.clearSelection}>
                <Text style={styles.clearSelectionText}>Descartar</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.inlineInfoText}>{formatDateTime(draftRestoredAt)}</Text>
        </View>
      ) : null}
      {!offlineNoticeDismissed ? (
        <View style={styles.inlineInfoCard}>
          <View style={styles.selectedHead}>
            <Text style={styles.inlineInfoTitle}>Funciona offline</Text>
            <Pressable onPress={() => setOfflineNoticeDismissed(true)} style={styles.clearSelection}>
              <Text style={styles.clearSelectionText}>Ocultar</Text>
            </Pressable>
          </View>
          <Text style={styles.inlineInfoText}>Se a conexão cair, o cadastro pode ficar salvo no aparelho e sincronizar depois.</Text>
        </View>
      ) : null}
      <View style={styles.createActionsRow}>
        <Pressable onPress={clearDraft} style={styles.linkAction}>
          <Text style={styles.linkActionText}>Limpar cadastro</Text>
        </Pressable>
      </View>
      {!canRegisterDelivery ? (
        <View style={styles.readOnlyCard}>
          <Text style={styles.readOnlyTitle}>Perfil sem permissão de cadastro</Text>
          <Text style={styles.readOnlyText}>Somente consulta.</Text>
        </View>
      ) : null}
      {isUnitSelectionPending(session) ? (
        <View style={styles.readOnlyCard}>
          <Text style={styles.readOnlyTitle}>Unidade obrigatória na sessão</Text>
          <Text style={styles.readOnlyText}>Selecione a unidade na sessão para continuar.</Text>
        </View>
      ) : null}

      {receiveEntryMode === "ocr" ? (
        <>
          <SectionHeader
            title="1. Ler etiqueta"
            subtitle=""
          />
        <View style={styles.ocrCard}>
          <Text style={styles.ocrTitle}>Leitura da etiqueta</Text>
          <Text style={styles.ocrText}>Fotografe a etiqueta inteira. Depois confirme a unidade e o destinatário sugeridos.</Text>
            <View style={styles.ocrPreview}>
              <Text style={styles.ocrPreviewTitle}>Sugestões do OCR</Text>
              <Text style={styles.ocrPreviewText}>{formatOcrPreview(ocrResult)}</Text>
            </View>
            <View style={styles.ocrActions}>
              <Button variant="secondary" loading={readingLabel} disabled={!canRegisterDelivery} onPress={captureLabel}>
                {draft.labelPhoto ? `${branding.labels.readLabel} novamente` : branding.labels.readLabel}
              </Button>
            </View>
            <Text style={styles.ocrHint}>
              {ocrStatus ?? (draft.labelPhoto ? "Etiqueta pronta para leitura." : "Fotografe a etiqueta para liberar a leitura.")}
            </Text>
            {ocrResult ? (
              <View style={styles.ocrConfirmationCard}>
                <Text style={styles.ocrConfirmationTitle}>Confirmação rápida</Text>
                <View style={styles.quickFacts}>
                  <View style={styles.quickFact}>
                    <Text style={styles.quickFactLabel}>Unidade</Text>
                    <Text style={styles.quickFactValue}>{selectedUnit ? displayUnitName(selectedUnit) : "Confirmar abaixo"}</Text>
                  </View>
                  <View style={styles.quickFact}>
                    <Text style={styles.quickFactLabel}>Destinatário</Text>
                    <Text style={styles.quickFactValue}>{selectedPerson?.name ?? (suggestedRecipientId ? "Sugestão destacada abaixo" : "Confirmar abaixo")}</Text>
                  </View>
                <View style={styles.quickFact}>
                  <Text style={styles.quickFactLabel}>Transportadora</Text>
                  <Text style={styles.quickFactValue}>{draft.deliveryCompany.trim() || "Obrigatória para salvar"}</Text>
                </View>
                  <View style={styles.quickFact}>
                    <Text style={styles.quickFactLabel}>Rastreio</Text>
                    <Text style={styles.quickFactValue}>{draft.trackingCode.trim() || "Não informado"}</Text>
                  </View>
                </View>
                <View style={styles.ocrConfirmationActions}>
                  <Pressable onPress={captureLabel} style={styles.inlineAction}>
                    <Text style={styles.inlineActionText}>Ler etiqueta novamente</Text>
                  </Pressable>
                  <Pressable onPress={() => scrollToSection("unit")} style={styles.inlineAction}>
                    <Text style={styles.inlineActionText}>Continuar conferência</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <SectionHeader
        title={receiveEntryMode === "ocr" ? "2. Confirmar unidade" : "1. Informar unidade"}
        subtitle=""
      />
      <View style={styles.searchRow} onLayout={(event) => { sectionOffsets.current.unit = event.nativeEvent.layout.y; }}>
        <View style={styles.searchInput}>
          <TextField
            label="Buscar unidade"
            required
            value={unitQuery}
            onChangeText={setUnitQuery}
            onFocus={() => {
              scrollToSection("unit");
              scrollAfterKeyboard(sectionOffsets.current.unit, 220);
            }}
            placeholder="Casa, bloco, apartamento"
            onSubmitEditing={() => {
              void searchUnits();
            }}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <Button style={styles.searchButton} loading={searchingUnits} disabled={!canSearchUnit} onPress={searchUnits}>
          Buscar
        </Button>
      </View>
      {unitQuery.trim() && !canSearchUnit ? <Text style={styles.resultHint}>Digite pelo menos 2 caracteres para buscar unidade.</Text> : null}
      {searchingUnits ? <Text style={styles.loadingHint}>Buscando unidades...</Text> : null}
      {units.length ? <Text style={styles.resultHint}>{units.length} unidade{units.length === 1 ? "" : "s"} encontrada{units.length === 1 ? "" : "s"}.</Text> : null}
      {units.length ? (
        <FlatList
          data={units}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.verticalList}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const active = selectedUnit?.id === item.id;
            return (
              <Pressable onPress={() => selectUnit(item)} style={[styles.person, styles.personVertical, active && styles.personActive]}>
                <Text style={styles.personName} numberOfLines={1}>
                  {item.nome || item.name}
                </Text>
                <Text style={styles.personMeta} numberOfLines={1}>
                  {displayUnitName(item)}
                </Text>
                <Text style={styles.personType}>Unidade</Text>
              </Pressable>
            );
          }}
        />
      ) : null}
      {selectedUnit && !selectedPerson ? (
        <View style={styles.inlineInfoCard}>
          <View style={styles.selectedHead}>
          <Text style={styles.inlineInfoTitle}>Destinatários da unidade</Text>
            <View style={styles.infoActions}>
              <Pressable onPress={() => void loadPeopleForSelectedUnit(selectedUnit)} style={styles.clearSelection}>
                <Text style={styles.clearSelectionText}>Atualizar</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.inlineInfoText}>Toque para selecionar em {displayUnitName(selectedUnit)}</Text>
          {suggestedRecipientId ? <Text style={styles.resultHint}>Sugestão do OCR destacada abaixo.</Text> : null}
          {loadingUnitPeople ? <Text style={styles.loadingHint}>Consultando moradores da unidade...</Text> : null}
          {unitPeople.length ? (
            <FlatList
              data={orderedUnitPeople}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.verticalList}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable onPress={() => selectRecipient(item)} style={[styles.person, styles.personVertical, suggestedRecipientId === item.id && styles.personSuggestedCard]}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.personMeta} numberOfLines={1}>
                    {personCategoryText(item)}
                  </Text>
                  {suggestedRecipientId === item.id ? <Text style={styles.personSuggested}>Sugestão do OCR</Text> : null}
                </Pressable>
              )}
            />
          ) : !loadingUnitPeople ? (
            <Text style={styles.resultHint}>Nenhum morador foi retornado para esta unidade.</Text>
          ) : null}
        </View>
      ) : null}

      {selectedUnit && !selectedPerson ? (
        <>
          <SectionHeader
            title={receiveEntryMode === "ocr" ? "3. Selecionar destinatário" : "2. Selecionar destinatário"}
            subtitle=""
          />
          {!showRecipientSearch ? (
            <View style={styles.recipientShortcutRow}>
              <Text style={styles.resultHint}>
                {unitPeople.length ? "Toque em um destinatário da unidade." : "Nenhum destinatário carregado para a unidade."}
              </Text>
              <Pressable onPress={() => setShowRecipientSearch(true)} style={styles.inlineAction}>
                <Text style={styles.inlineActionText}>Buscar outro destinatário</Text>
              </Pressable>
            </View>
          ) : (
            <>
          <View style={styles.searchRow} onLayout={(event) => { sectionOffsets.current.recipient = event.nativeEvent.layout.y; }}>
            <View style={styles.searchInput}>
              <TextField
                label="Morador ou documento"
                value={recipientQuery}
                onChangeText={setRecipientQuery}
                onFocus={() => {
                  scrollToSection("recipient");
                  scrollAfterKeyboard(sectionOffsets.current.recipient, 220);
                }}
                onSubmitEditing={searchRecipient}
                    autoCapitalize="none"
                    returnKeyType="search"
                    editable
                  />
                </View>
                <Button style={styles.searchButton} loading={searching} disabled={!canSearchRecipient} onPress={searchRecipient}>
                  Buscar
                </Button>
              </View>
              {recipientQuery.trim() && !canSearchRecipient ? <Text style={styles.resultHint}>Digite pelo menos 2 caracteres para buscar pessoa.</Text> : null}
              {searching ? <Text style={styles.loadingHint}>Buscando pessoas...</Text> : null}
              {people.length ? <Text style={styles.resultHint}>{people.length} resultado{people.length === 1 ? "" : "s"}.</Text> : null}
              {recipientQuery.trim() ? (
                <Pressable
                  onPress={() => {
                    setRecipientQuery("");
                    setPeople([]);
                    setShowRecipientSearch(false);
                  }}
                  style={styles.inlineAction}
                >
                  <Text style={styles.inlineActionText}>Voltar para lista da unidade</Text>
                </Pressable>
              ) : null}
              {recipientQuery.trim().length >= 2 && !searching && !people.length ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>Nenhuma pessoa encontrada.</Text>
                </View>
              ) : null}

              {people.length ? (
                <FlatList
                  data={people}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.verticalList}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    return (
                      <Pressable onPress={() => selectRecipient(item)} style={[styles.person, styles.personVertical]}>
                        <Text style={styles.personName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.personMeta} numberOfLines={1}>
                          {displayPersonUnit(item)}
                        </Text>
                        <View style={styles.personFooter}>
                          <Text style={styles.personType}>{personCategoryText(item)}</Text>
                        </View>
                      </Pressable>
                    );
                  }}
                />
              ) : null}
            </>
          )}
        </>
      ) : null}

      {selectedPerson && selectedUnit ? (
        <View style={styles.recipientShortcutRow}>
          <Text style={styles.resultHint}>Destinatário selecionado.</Text>
          <Pressable
            onPress={() => {
              clearRecipientSelection();
              setShowRecipientSearch(false);
            }}
            style={styles.inlineAction}
          >
            <Text style={styles.inlineActionText}>Trocar destinatário</Text>
          </Pressable>
        </View>
      ) : null}

      {selectedUnit || selectedPerson ? (
      <View style={styles.selectedCard}>
        <View style={styles.selectedHead}>
          <Text style={styles.selectedLabel}>Conferência</Text>
          {selectedPerson || selectedUnit ? (
            <Pressable onPress={() => { clearRecipientSelection(); clearUnitSelection(); }} style={styles.clearSelection}>
              <Text style={styles.clearSelectionText}>Limpar</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.selectedName}>{selectedPerson?.name ?? (draft.recipientName || "Nenhum selecionado")}</Text>
        <Text style={styles.selectedMeta}>
          Unidade: {selectedUnit ? displayUnitName(selectedUnit) : selectedPerson ? displayPersonUnit(selectedPerson) : "busque e selecione acima"}
        </Text>
        {selectedPerson ? <Text style={styles.selectedDetail}>{personCategoryText(selectedPerson)}</Text> : null}
        <Text style={styles.selectedAction}>{selectedPerson ? "Pronto para completar os dados e salvar." : selectedUnit ? "Escolha o destinatário para continuar." : "Selecione a unidade."}</Text>
      </View>
      ) : null}
      {selectedPerson && personAttentionText(selectedPerson) ? (
        <View style={styles.attentionCard}>
          <Text style={styles.attentionTitle}>Conferência recomendada</Text>
          <Text style={styles.attentionText}>{personAttentionText(selectedPerson)}</Text>
        </View>
      ) : null}
      {hasRecipientUnitMismatch ? (
        <View style={styles.attentionCard}>
          <Text style={styles.attentionTitle}>Unidade diferente do cadastro da pessoa</Text>
          <Text style={styles.attentionText}>Confirme a unidade manualmente.</Text>
          <View style={styles.confirmRow}>
            <View style={styles.confirmTextWrap}>
              <Text style={styles.confirmTitle}>Confirmação do porteiro</Text>
              <Text style={styles.confirmText}>Confirmo que esta encomenda deve seguir para a unidade selecionada manualmente.</Text>
            </View>
            <Switch
              value={unitMismatchConfirmed}
              onValueChange={setUnitMismatchConfirmed}
              trackColor={{ true: "#A9D8CB", false: "#CED8D4" }}
            />
          </View>
        </View>
      ) : null}
      {selectedPersonEmailInvalid ? (
        <View style={styles.attentionCard}>
          <Text style={styles.attentionTitle}>E-mail com formato incompleto</Text>
          <Text style={styles.attentionText}>Vale conferir com a administração.</Text>
        </View>
      ) : null}


      {selectedUnit ? (
      <>
      <SectionHeader
        title={receiveEntryMode === "ocr" ? "4. Completar dados" : "3. Completar dados"}
        subtitle=""
      />
      <View style={styles.form} onLayout={(event) => { sectionOffsets.current.details = event.nativeEvent.layout.y; }}>
        <TextField
          label="Destinatário"
          required
          value={draft.recipientName}
          onChangeText={(recipientName) => patch({ recipientName })}
          autoCapitalize="words"
          onFocus={() => scrollAfterKeyboard(sectionOffsets.current.details, 72)}
          errorText={submitAttempted && !draft.recipientName.trim() ? "Confirme quem vai receber a encomenda." : undefined}
        />
        <TextField
          label="Transportadora"
          required
          value={draft.deliveryCompany}
          onChangeText={(deliveryCompany) => patch({ deliveryCompany })}
          autoCapitalize="words"
          onFocus={() => scrollAfterKeyboard(sectionOffsets.current.details, 72)}
          errorText={submitAttempted && !draft.deliveryCompany.trim() ? "Informe a transportadora antes de salvar." : undefined}
        />
        {draft.deliveryCompany ? (
          <Pressable onPress={() => patch({ deliveryCompany: "" })} style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Limpar transportadora</Text>
          </Pressable>
        ) : null}
        {draft.trackingCode ? (
          <Pressable onPress={() => patch({ trackingCode: "" })} style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Limpar código de rastreio</Text>
          </Pressable>
        ) : null}
        <TextField
          label="Código de rastreio"
          value={draft.trackingCode}
          onChangeText={(trackingCode) => patch({ trackingCode: sanitizeDocumentInput(trackingCode).slice(0, 32) })}
          autoCapitalize="characters"
          maxLength={32}
          onFocus={() => scrollAfterKeyboard(sectionOffsets.current.details, 32)}
        />
      </View>


      <PhotoSlot
        title="Foto do volume"
        photo={draft.packagePhoto}
        onTakePhoto={capturePackage}
        onClearPhoto={() => patch({ packagePhoto: undefined })}
        disabled={!canRegisterDelivery}
      />

      <Button loading={saving} disabled={!canSubmitDelivery} onPress={submit}>
        Salvar e notificar morador
      </Button>
      <Text style={canSubmitDelivery ? styles.saveReadyHint : styles.saveBlockedHint}>{deliveryNextAction}</Text>
      </>
      ) : null}
        </>
      ) : modeSelected ? (
        <>
          <SectionHeader
            title="1. Selecionar unidade"
            subtitle=""
          />
          <View style={styles.searchRow} onLayout={(event) => { sectionOffsets.current.lookupUnit = event.nativeEvent.layout.y; }}>
            <View style={styles.searchInput}>
              <TextField
                label="Buscar unidade"
                required
                value={lookupUnitQuery}
                onChangeText={setLookupUnitQuery}
                onFocus={() => {
                  scrollToSection("lookupUnit");
                  scrollAfterKeyboard(sectionOffsets.current.lookupUnit, 220);
                }}
                placeholder="Casa, bloco, apartamento"
                onSubmitEditing={() => {
                  void searchLookupUnits();
                }}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>
            <Button style={styles.searchButton} loading={loadingLookupUnits} disabled={!canSearchLookupUnit} onPress={searchLookupUnits}>
              Buscar
            </Button>
          </View>
          {lookupUnitQuery.trim() && !canSearchLookupUnit ? <Text style={styles.resultHint}>Digite pelo menos 2 caracteres para buscar unidade.</Text> : null}
          {loadingLookupUnits ? <Text style={styles.loadingHint}>Buscando unidades...</Text> : null}
          {lookupUnits.length ? <Text style={styles.resultHint}>{lookupUnits.length} unidade{lookupUnits.length === 1 ? "" : "s"} encontrada{lookupUnits.length === 1 ? "" : "s"}.</Text> : null}
          {lookupUnitQuery.trim().length >= 2 && !loadingLookupUnits && !lookupUnits.length && !selectedLookupUnit ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Nenhuma unidade encontrada com essa busca.</Text>
            </View>
          ) : null}
          <FlatList
            data={lookupUnits}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.verticalList}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const active = selectedLookupUnit?.id === item.id;
              return (
                <Pressable onPress={() => selectLookupUnit(item)} style={[styles.person, styles.personVertical, active && styles.personActive]}>
                  <Text style={styles.personName} numberOfLines={1}>{item.nome || item.name}</Text>
                  <Text style={styles.personMeta} numberOfLines={1}>{displayUnitName(item)}</Text>
                  <Text style={styles.personType}>Unidade</Text>
                </Pressable>
              );
            }}
          />

          <View style={styles.selectedCard}>
            <View style={styles.selectedHead}>
              <Text style={styles.selectedLabel}>Unidade selecionada</Text>
              {selectedLookupUnit ? (
                <Pressable onPress={() => { setSelectedLookupUnit(undefined); setLookupResults([]); setLookupUnitQuery(""); }} style={styles.clearSelection}>
                  <Text style={styles.clearSelectionText}>Limpar</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.selectedName}>{selectedLookupUnit ? displayUnitName(selectedLookupUnit) : "Nenhuma unidade selecionada"}</Text>
            <Text style={styles.selectedMeta}>
              {selectedLookupUnit ? "As encomendas desta unidade carregam automaticamente." : "Selecione a unidade para continuar."}
            </Text>
          </View>

          <Button loading={loadingLookupResults} disabled={!selectedLookupUnit} onPress={() => void loadLookupDeliveries()}>
            {mode === "deliver" ? "Atualizar encomendas para entrega" : "Atualizar consulta"}
          </Button>

          {selectedLookupUnit ? (
            <View style={styles.filtersRow}>
              <Pressable onPress={() => setLookupFilter("pending")} style={[styles.filterChip, lookupFilter === "pending" && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, lookupFilter === "pending" && styles.filterChipTextActive]}>
                  Aguardando retirada ({lookupResults.filter(isDeliveryAwaitingWithdrawal).length})
                </Text>
              </Pressable>
              <Pressable onPress={() => setLookupFilter("withdrawn")} style={[styles.filterChip, lookupFilter === "withdrawn" && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, lookupFilter === "withdrawn" && styles.filterChipTextActive]}>
                  Retiradas ({lookupResults.filter((item) => !isDeliveryAwaitingWithdrawal(item)).length})
                </Text>
              </Pressable>
              <Pressable onPress={() => setLookupFilter("all")} style={[styles.filterChip, lookupFilter === "all" && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, lookupFilter === "all" && styles.filterChipTextActive]}>
                  Todas ({lookupResults.length})
                </Text>
              </Pressable>
            </View>
          ) : null}

          {visibleLookupResults.length ? (
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>{visibleLookupResults.length} encomenda{visibleLookupResults.length === 1 ? "" : "s"} encontrada{visibleLookupResults.length === 1 ? "" : "s"}</Text>
              {visibleLookupResults.map((item) => (
                <View key={item.id} style={styles.selectedCard}>
                  <View style={styles.selectedHead}>
                    <Text style={styles.selectedName}>{item.deliveryCompany || "Encomenda"}</Text>
                    <Text style={styles.badgeSmall}>{statusText(item.status)}</Text>
                  </View>
                  <Text style={styles.selectedDetail}>Recebida na portaria: {formatDateTime(item.receivedAt ?? item.createdAt ?? new Date().toISOString())}</Text>
                  <Text style={styles.selectedDetail}>
                    Destinatário: {item.recipientPersonId ? "Destinatário identificado" : "Destinatário não informado"}
                  </Text>
                  <Text style={styles.selectedDetail}>
                    {item.notificationSentAt ? `Notificação enviada em ${formatDateTime(item.notificationSentAt)}` : "Notificação ainda não enviada"}
                  </Text>
                  {item.withdrawnByName ? <Text style={styles.selectedDetail}>Retirada por: {item.withdrawnByName}</Text> : null}
                  {item.withdrawalValidatedByUserName ? <Text style={styles.selectedDetail}>Validada por: {item.withdrawalValidatedByUserName}</Text> : null}
                  {item.withdrawnAt ? <Text style={styles.selectedDetail}>Retirada em: {formatDateTime(item.withdrawnAt)}</Text> : null}
                  {item.withdrawalValidationMethod ? <Text style={styles.selectedDetail}>Última validação: {withdrawalMethodText(item.withdrawalValidationMethod)}</Text> : null}
                  {item.withdrawalFailureReason ? <Text style={styles.attentionText}>Falha anterior: {item.withdrawalFailureReason}</Text> : null}
                  {mode !== "query" && canShowDeliveryRenotify(item, session) ? (
                    <View style={styles.summaryActionRow}>
                      <Button
                        compact
                        variant="secondary"
                        style={styles.equalActionButton}
                        loading={renotifyingDeliveryId === item.id}
                        onPress={() => { void renotifyLookupDelivery(item); }}
                      >
                        Reenviar notificação
                      </Button>
                    </View>
                  ) : null}
                  {mode === "query" ? (
                    <View style={styles.summaryActionRow}>
                      {!item.syncPending && isDeliveryAwaitingWithdrawal(item) ? (
                        <>
                          {canShowDeliveryRenotify(item, session) ? (
                            <Button
                              compact
                              variant="secondary"
                              style={styles.equalActionButton}
                              loading={renotifyingDeliveryId === item.id}
                              onPress={() => { void renotifyLookupDelivery(item); }}
                            >
                              Reenviar notificação
                            </Button>
                          ) : null}
                          <Button
                            compact
                            variant="secondary"
                            style={styles.equalActionButton}
                            onPress={() => {
                              setMode("deliver");
                              setModeSelected(true);
                              setLookupFilter("pending");
                            }}
                          >
                            Entregar agora
                          </Button>
                        </>
                      ) : null}
                    </View>
                  ) : canValidateDelivery && isDeliveryAwaitingWithdrawal(item) ? (
                    <>
                      <View onLayout={(event) => { sectionOffsets.current.withdrawal = event.nativeEvent.layout.y; }}>
                        <TextField
                          label="Código de retirada"
                          value={withdrawalCodes[item.id] ?? ""}
                          onChangeText={(value) => setWithdrawalCodes((current) => ({ ...current, [item.id]: sanitizeDocumentInput(value) }))}
                          autoCapitalize="characters"
                          onFocus={() => scrollAfterKeyboard(sectionOffsets.current.withdrawal, 72)}
                          helperText="Opcional se a retirada for por QR ou confirmação manual."
                        />
                      </View>
                      <View style={styles.ocrActions}>
                        <Button
                          variant="secondary"
                          disabled={!getDeliveryWithdrawalQrCodeUrl(item)}
                          onPress={() => setScannerDeliveryId(item.id)}
                        >
                          Ler QR
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={!hasDeliveryWithdrawalData(item)}
                          loading={validatingDeliveryId === item.id}
                          onPress={() => { void validateLookupDelivery(item); }}
                        >
                          Validar código
                        </Button>
                        <Button
                          variant="secondary"
                          loading={validatingDeliveryId === item.id}
                          onPress={() => { void validateLookupDelivery(item, true); }}
                        >
                          Confirmar manualmente
                        </Button>
                      </View>
                      <Text style={styles.resultHint}>Use `Confirmar manualmente` somente quando o morador estiver presente e a retirada tiver sido conferida na portaria.</Text>
                    </>
                  ) : null}
                </View>
              ))}
            </View>
          ) : selectedLookupUnit && !loadingLookupResults ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                {lookupFilter === "pending"
                  ? "Nenhuma encomenda aguardando retirada para essa unidade."
                  : lookupFilter === "withdrawn"
                    ? "Nenhuma encomenda retirada encontrada para essa unidade."
                    : "Nenhuma encomenda encontrada para essa unidade."}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
      
      {scannerDeliveryId ? (
        <QrScannerModal
          visible
          onClose={() => setScannerDeliveryId(undefined)}
          onCode={(value) => {
            const item = visibleLookupResults.find((delivery) => delivery.id === scannerDeliveryId);
            if (item) {
              void validateLookupDelivery(item, false, value);
            }
          }}
        />
      ) : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function dedupeTexts(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized || normalized.length < 2) {
      return;
    }

    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(normalized);
  });

  return result;
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={[styles.step, done && styles.stepDone]}>
      <Text style={[styles.stepText, done && styles.stepTextDone]}>{label}</Text>
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

function ModeChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeChip, active && styles.modeChipActive]}>
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function buildQueuedDelivery(draft: DeliveryDraft, selectedUnit?: Unit): Delivery {
  const now = new Date().toISOString();
  const clientRequestId = draft.clientRequestId ?? `guard-app-delivery-${Date.now()}`;

  return {
    id: `queued-delivery-${Date.now()}`,
    clientRequestId,
    recipientUnitId: draft.unitId,
    recipientUnitName: selectedUnit ? displayUnitName(selectedUnit) : undefined,
    recipientPersonId: draft.recipientPersonId || null,
    deliveryCompany: draft.deliveryCompany.trim() || "Não informada",
    trackingCode: draft.trackingCode.trim() || null,
    status: "RECEIVED",
    createdAt: now,
    performedAt: now,
    clientType: "GUARD_APP",
    deviceName: "guarita-mobile",
    evidenceUrl: draft.packagePhoto?.uri ?? draft.labelPhoto?.uri ?? null,
    receivedAt: now,
    notificationStatus: "PENDING_SYNC",
    syncPending: true
  };
}

function getDeliveryNextAction({
  canRegisterDelivery,
  unitId,
  recipientName,
  deliveryCompany,
  labelPhoto,
  packagePhoto
}: {
  canRegisterDelivery: boolean;
  unitId?: string;
  recipientName?: string;
  deliveryCompany?: string;
  labelPhoto: boolean;
  packagePhoto: boolean;
}) {
  if (!canRegisterDelivery) {
    return "Seu perfil está liberado apenas para consulta. Use o histórico para acompanhar as entregas do dia.";
  }

  if (!unitId) {
    return "Comece selecionando a unidade da encomenda.";
  }

  if (!recipientName) {
    return "Selecione o destinatário para concluir o registro da encomenda.";
  }

  if (!deliveryCompany) {
    return "Informe a transportadora antes de salvar a encomenda.";
  }

  if (!labelPhoto) {
    return "Fotografe a etiqueta se quiser usar OCR e preencher os dados com mais rapidez.";
  }

  if (!packagePhoto) {
    return "A foto do volume é opcional. Se estiver tudo conferido, você já pode salvar.";
  }

  return "Tudo conferido. Salve a encomenda para registrar o recebimento e notificar o morador.";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPendingDaysLabel(value?: string | null) {
  if (!value) {
    return "Hoje";
  }

  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));

  if (days <= 0) {
    return "Hoje";
  }

  return days === 1 ? "1 dia" : `${days} dias`;
}

function isLikelyRecoveredDelivery(item: Delivery, draft: DeliveryDraft, unit?: Unit) {
  const itemReceivedAt = new Date(item.receivedAt ?? item.createdAt ?? 0).getTime();
  const recentEnough = Number.isFinite(itemReceivedAt) && Date.now() - itemReceivedAt < 5 * 60 * 1000;
  const sameUnit =
    item.recipientUnitId === draft.unitId ||
    (!!unit && normalizeSearchText(displayDeliveryUnit(item)) === normalizeSearchText(displayUnitName(unit)));
  const sameCompany =
    normalizeSearchText(item.deliveryCompany ?? "") === normalizeSearchText(draft.deliveryCompany.trim() || "Não informada");
  const sameTracking =
    normalizeSearchText(item.trackingCode ?? "") === normalizeSearchText(draft.trackingCode.trim());

  return recentEnough && sameUnit && (sameTracking || sameCompany);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOfflineError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("network request failed") || normalized.includes("failed to fetch") || normalized.includes("timeout");
}

function formatOcrPreview(result?: DeliveryLabelOcrResult) {
  if (!result) {
    return "Depois da leitura, esta área mostra transportadora, código, pista de unidade e o texto reconhecido para conferência do porteiro.";
  }

  const parts = [
    result.suggestions?.recipientName ? `Destinatário: ${result.suggestions.recipientName}` : "",
    result.suggestions?.deliveryCompany || result.carrierHint ? `Transportadora: ${result.suggestions?.deliveryCompany ?? result.carrierHint}` : "",
    result.suggestions?.trackingCode || result.trackingCodeCandidates?.[0]
      ? `Rastreio: ${result.suggestions?.trackingCode ?? result.trackingCodeCandidates?.[0]}`
      : "",
    result.unitHint ? `Unidade sugerida: ${result.unitHint}` : "",
    result.unitSuggestions?.[0]
      ? `Sugestão de unidade: ${result.unitSuggestions[0].unitName ?? result.unitSuggestions[0].name ?? result.unitSuggestions[0].label ?? "unidade"}`
      : "",
    result.residentSuggestions?.[0] ? `Sugestão de morador: ${result.residentSuggestions[0].name}` : "",
    result.confidence != null ? `Confiança: ${Math.round(result.confidence * 100)}%` : "",
    result.rawText ? `Texto lido: ${truncateText(result.rawText, 180)}` : ""
  ].filter(Boolean);

  return parts.join(" | ");
}

function truncateText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function isStrongPersonMatch(person: PersonSearchResult, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return false;
  }

  const names = [person.name]
    .filter(Boolean)
    .map((item) => normalizeSearchText(String(item)));

  return names.some((item) => item === normalizedQuery || item.startsWith(`${normalizedQuery} `));
}

function findBestRecipientCandidate(candidates: PersonSearchResult[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return undefined;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 2);
  if (!queryTokens.length) {
    return undefined;
  }

  const ranked = candidates
    .map((candidate) => {
      const normalizedName = normalizeSearchText(candidate.name);
      const score = queryTokens.reduce((total, token) => total + (normalizedName.includes(token) ? 1 : 0), 0);
      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  const second = ranked[1];
  if (!best) {
    return undefined;
  }

  if (best.score === queryTokens.length && (!second || best.score > second.score)) {
    return best.candidate;
  }

  return undefined;
}

function findSuggestedRecipientCandidate(candidates: PersonSearchResult[], hints: string[]) {
  const ranked = candidates
    .map((candidate) => {
      const normalizedName = normalizeSearchText(candidate.name);
      const score = hints.reduce((total, hint) => {
        const normalizedHint = normalizeSearchText(hint);
        if (!normalizedHint) {
          return total;
        }

        const tokens = normalizedHint.split(/\s+/).filter((token) => token.length >= 2);
        const tokenScore = tokens.reduce((inner, token) => inner + (normalizedName.includes(token) ? 1 : 0), 0);
        const phraseBonus =
          normalizedHint.includes(normalizedName) || normalizedName.includes(normalizedHint) ? 3 : 0;

        return total + tokenScore + phraseBonus;
      }, 0);

      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.candidate;
}

function findBestRecipientCandidateInText(candidates: PersonSearchResult[], text: string) {
  const normalizedText = normalizeSearchText(text);
  if (!normalizedText) {
    return undefined;
  }

  const ranked = candidates
    .map((candidate) => {
      const tokens = normalizeSearchText(candidate.name).split(/\s+/).filter((token) => token.length >= 2);
      const score = tokens.reduce((total, token) => total + (normalizedText.includes(token) ? 1 : 0), 0);
      return { candidate, score, tokenCount: tokens.length };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  const second = ranked[1];
  if (!best) {
    return undefined;
  }

  const strongEnough = best.score >= 2 || (best.tokenCount === 1 && best.score === 1);
  const isolated = !second || best.score > second.score;
  if (strongEnough && isolated) {
    return best.candidate;
  }

  return undefined;
}

function expandUnitLookupTerms(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  const variations = new Set<string>([normalized]);
  const cleaned = normalized.replace(/\s+/g, " ").trim();
  const strippedPrefix = cleaned.replace(/^(casa|apartamento|apto|apt|ap|bloco|bl|quadra|qd|lote|lt|sala|sl)\s+/i, "").trim();
  if (strippedPrefix && strippedPrefix !== cleaned) {
    variations.add(strippedPrefix);
  }

  const lastToken = cleaned.split(" ").filter(Boolean).at(-1);
  if (lastToken && lastToken !== cleaned) {
    variations.add(lastToken);
  }

  return Array.from(variations);
}

function isStrongUnitMatch(unit: Unit, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return false;
  }

  const candidates = [unit.nome, unit.name, displayUnitName(unit)]
    .filter(Boolean)
    .map((item) => normalizeSearchText(String(item)));

  return candidates.some((item) => item === normalizedQuery || item.startsWith(normalizedQuery));
}

function extractUnitHintsFromOcr(result: DeliveryLabelOcrResult) {
  const source = normalizeSearchText([
    result.suggestions?.unitName ?? undefined,
    result.unitHint ?? undefined,
    result.normalizedText ?? undefined,
    result.rawText ?? undefined
  ]
    .filter(Boolean)
    .join(" "));

  if (!source) {
    return [];
  }

  const matches = new Set<string>();
  const pattern = /\b(casa|apartamento|apto|apt|ap|bloco|bl|quadra|qd|lote|lt|sala|sl)\s*([a-z0-9-]{1,12})\b/g;
  let current: RegExpExecArray | null;

  while ((current = pattern.exec(source)) !== null) {
    const prefix = current[1];
    const value = current[2];
    matches.add(`${prefix} ${value}`);
  }

  return Array.from(matches);
}

function extractUnitSuggestionsFromOcr(result: DeliveryLabelOcrResult) {
  return (result.unitSuggestions ?? [])
    .flatMap((item) => [item.unitName, item.name, item.label, item.unitId])
    .filter(Boolean) as string[];
}

function extractRecipientCandidateTextFromOcr(result: DeliveryLabelOcrResult) {
  const source = normalizeSearchText(
    [result.suggestions?.recipientName ?? undefined, result.normalizedText ?? undefined, result.rawText ?? undefined]
      .filter(Boolean)
      .join(" ")
  );

  if (!source) {
    return undefined;
  }

  const afterDestinatário = source.match(/(?:destinatário|recebedor|morador|para)\s*:?\s*([a-z\s]{5,80})/i)?.[1]?.trim();
  if (afterDestinatário) {
    return afterDestinatário;
  }

  return undefined;
}

function extractRecipientHintsFromOcr(result: DeliveryLabelOcrResult) {
  const source = normalizeSearchText(
    [result.normalizedText ?? undefined, result.rawText ?? undefined]
      .filter(Boolean)
      .join(" ")
  );

  if (!source) {
    return [];
  }

  const hints = new Set<string>();
  const patterns = [
    /(?:destinatário|recebedor|morador|para)\s*:?\s*([a-z\s]{5,80})/gi,
    /(?:sr|sra|srta)\.?\s+([a-z\s]{5,80})/gi
  ];

  patterns.forEach((pattern) => {
    let current: RegExpExecArray | null;
    while ((current = pattern.exec(source)) !== null) {
      const value = current[1]?.trim();
      if (value) {
        hints.add(value);
      }
    }
  });

  return Array.from(hints);
}

function extractResidentSuggestionsFromOcr(result: DeliveryLabelOcrResult) {
  return (result.residentSuggestions ?? [])
    .flatMap((item) => [item.name, item.unitName])
    .filter(Boolean) as string[];
}

function appendOcrStatus(current: string | undefined, addition: string) {
  if (!addition.trim()) {
    return current;
  }

  if (!current?.trim()) {
    return `OCR aplicado: ${addition}.`;
  }

  const normalizedCurrent = current.replace(/\.$/, "");
  if (normalizedCurrent.toLowerCase().includes(addition.toLowerCase())) {
    return current;
  }

  return `${normalizedCurrent}, ${addition}.`;
}

function isOlderThanHours(value: string, hours: number) {
  return Date.now() - new Date(value).getTime() > hours * 60 * 60 * 1000;
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: 14,
    padding: 16,
    paddingBottom: 160
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  actionChooser: {
    gap: 10
  },
  actionChooserTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  actionCard: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  actionCardReceive: {
    backgroundColor: "#EAF3FD",
    borderColor: "#BFD6F3"
  },
  actionCardDeliver: {
    backgroundColor: "#EEF8F1",
    borderColor: "#C7E3CF"
  },
  actionCardQuery: {
    backgroundColor: "#FFF5E8",
    borderColor: "#F0D5AA"
  },
  actionCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  actionCardText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "justify"
  },
  modeSelectorBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  modeSelectorActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  topAction: {
    alignItems: "center",
    minWidth: 128
  },
  modeSelectorText: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900"
  },
  modeChip: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  modeChipActive: {
    backgroundColor: "#E8F1FB",
    borderColor: "#BCD4F0"
  },
  modeChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  modeChipTextActive: {
    color: colors.primaryDark
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
  listSection: {
    gap: 10
  },
  badgeSmall: {
    backgroundColor: "#E8F1FB",
    borderRadius: 8,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  progressStep: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    flexBasis: "30%",
    flexDirection: "row",
    gap: 6,
    minWidth: 92,
    paddingHorizontal: 2,
    paddingVertical: 2
  },
  progressStepDone: {
    backgroundColor: "transparent"
  },
  progressStepIndex: {
    color: "#A5B1C2",
    fontSize: 14,
    fontWeight: "900"
  },
  progressStepIndexDone: {
    color: colors.primaryDark
  },
  progressStepLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
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
  personSuggestedCard: {
    backgroundColor: "#F6F9FD",
    borderColor: "#BCD4F0"
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
  personSuggested: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  personFooter: {
    gap: 3
  },
  personDoc: {
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
  createActionsRow: {
    alignItems: "flex-start"
  },
  receiveModeRow: {
    flexDirection: "row",
    gap: 8
  },
  receiveModeChip: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  receiveModeChipActive: {
    backgroundColor: "#E8F1FB",
    borderColor: "#BCD4F0"
  },
  receiveModeChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  receiveModeChipTextActive: {
    color: colors.primaryDark
  },
  linkAction: {
    paddingVertical: 2
  },
  linkActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  inlineAction: {
    alignSelf: "flex-start",
    marginTop: -2
  },
  recipientShortcutRow: {
    gap: 6
  },
  inlineActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  selectedCard: {
    backgroundColor: "#E8F1FB",
    borderColor: "#BCD4F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
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
    lineHeight: 18
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
  selectedAction: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  summaryActionRow: {
    flexDirection: "row",
    gap: 10
  },
  equalActionButton: {
    flex: 1
  },
  saveBlockedHint: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: -2
  },
  saveReadyHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: -2
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
    lineHeight: 18
  },
  confirmRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 6
  },
  confirmTextWrap: {
    flex: 1,
    gap: 2
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900"
  },
  confirmText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  ocrCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  ocrTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  ocrText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  ocrSteps: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  step: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  stepDone: {
    backgroundColor: "#E8F1FB",
    borderColor: "#BCD4F0"
  },
  stepText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  stepTextDone: {
    color: colors.primaryDark
  },
  ocrActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  ocrPreview: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10
  },
  ocrPreviewTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  ocrPreviewText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  ocrConfirmationCard: {
    backgroundColor: "#F6F9FD",
    borderColor: "#BCD4F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 10
  },
  ocrConfirmationTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  quickFacts: {
    gap: 8
  },
  quickFact: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  quickFactLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  quickFactValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  ocrConfirmationText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "justify"
  },
  ocrConfirmationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 2
  },
  ocrHint: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800"
  },
  form: {
    gap: 12
  },
  emptySearch: {
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 8
  },
  emptyCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  inlineInfoCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10
  },
  inlineInfoTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  inlineInfoText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  infoActions: {
    flexDirection: "row",
    gap: 10
  },
  emptyCardText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  emptyAction: {
    alignSelf: "flex-start",
    marginTop: 10
  },
  emptyActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  filterChip: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  filterChipActive: {
    backgroundColor: "#E8F1FB",
    borderColor: "#BCD4F0"
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  filterChipTextActive: {
    color: colors.primaryDark
  }
});

















