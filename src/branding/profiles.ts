export type BrandingProfileKey = "rafiels" | "cliente-a";

export const brandingProfiles = {
  rafiels: {
    logos: {
      primary: require("../../assets/logo-v8.png"),
      developer: require("../../assets/Logo-Rafiels.png")
    },
    defaults: {
      appName: "Guarita",
      appShortName: "Guarita",
      operationalBadgeText: "Acesso operacional",
      loginSubtitle: "Entre para usar encomendas, pessoas e acessos.",
      bootSubtitle: "Carregando sessão e dados locais...",
      developerSignaturePrefix: "Desenvolvido por: ",
      developerSignatureName: "RAFIELS SOLUCOES",
      showDeveloperSignature: true,
      labels: {
        home: "Início",
        deliveries: "Encomendas",
        accesses: "Acessos",
        people: "Pessoas",
        messages: "Mensagens",
        receiveDelivery: "Recebendo encomenda",
        deliverDelivery: "Entregando encomenda",
        deliveryQuery: "Consulta",
        manualEntry: "Preencher manualmente",
        readLabel: "Ler etiqueta"
      },
      features: {
        deliveries: true,
        people: true,
        accesses: true,
        messages: true,
        deliveryOcr: true,
        deliveryManualEntry: true
      },
      palette: {
        background: "#F4F7FB",
        surface: "#FFFFFF",
        text: "#172033",
        muted: "#64748B",
        line: "#D7E0EC",
        primary: "#1F6FBD",
        primaryDark: "#124C8C",
        danger: "#B3261E",
        warning: "#B26A00",
        success: "#2E7D52",
        ink: "#253246"
      }
    }
  },
  "cliente-a": {
    logos: {
      primary: require("../../assets/logo-v8.png"),
      developer: require("../../assets/Logo-Rafiels.png")
    },
    defaults: {
      appName: "Operacao Cliente A",
      appShortName: "Operacao A",
      operationalBadgeText: "Uso operacional",
      loginSubtitle: "Entre para operar entregas, pessoas e acessos.",
      bootSubtitle: "Preparando sessão e dados locais...",
      developerSignaturePrefix: "Tecnologia por: ",
      developerSignatureName: "CLIENTE A DIGITAL",
      showDeveloperSignature: false,
      labels: {
        home: "Painel",
        deliveries: "Entregas",
        accesses: "Movimento",
        people: "Cadastros",
        messages: "Mensagens",
        receiveDelivery: "Receber entrega",
        deliverDelivery: "Entregar",
        deliveryQuery: "Consultar",
        manualEntry: "Preencher",
        readLabel: "Ler etiqueta"
      },
      features: {
        deliveries: true,
        people: true,
        accesses: true,
        messages: true,
        deliveryOcr: true,
        deliveryManualEntry: true
      },
      palette: {
        background: "#F5F8FC",
        surface: "#FFFFFF",
        text: "#122033",
        muted: "#667788",
        line: "#D4DEEA",
        primary: "#0E74B8",
        primaryDark: "#0A4E82",
        danger: "#B3261E",
        warning: "#A96A00",
        success: "#2C7A4B",
        ink: "#243247"
      }
    }
  }
} as const;


