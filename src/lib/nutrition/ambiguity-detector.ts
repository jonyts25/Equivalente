export const AMBIGUOUS_PORTION_WORDS = [
  "normal",
  "chico",
  "grande",
  "tantito",
  "poquito",
  "pedacito",
  "una pieza",
  "un vaso",
  "una cucharada",
  "una bolsita",
  "una tortillita",
  "una probadita",
  "algo leve",
  "no mucho",
  "de los pequeños",
  "de los normales",
  "regular",
  "al tanteo",
  "puñito",
  "embarradita",
  "cuchara",
  "copeteada",
  "individual",
  "familiar",
] as const;

export const RISKY_FOODS = [
  "chocolate",
  "crema de cacahuate",
  "pan dulce",
  "galletas",
  "cereal",
  "papas",
  "frituras",
  "pastel",
  "helado",
  "pizza",
  "hamburguesa",
  "sushi empanizado",
  "alcohol",
  "refresco",
  "jugo",
  "leche condensada",
  "granola",
  "nueces",
  "aguacate",
  "aceite",
  "queso",
  "aderezo",
  "mazapán",
  "mazapan",
] as const;

export type AmbiguityStatus =
  | "ok"
  | "requires_clarification"
  | "blocked"
  | "adapted_only";

export interface AmbiguityResult {
  status: AmbiguityStatus;
  message: string;
  questions: string[];
  detectedFoods: string[];
  detectedAmbiguity: string[];
}

const CLARIFICATION_TEMPLATES: Record<string, string> = {
  mazapán:
    "Va, pero ajustemos bien: ¿fue pieza individual estándar, grande, cubierta, doble, artesanal o más de una pieza?",
  mazapan:
    "Va, pero ajustemos bien: ¿fue pieza individual estándar, grande, cubierta, doble, artesanal o más de una pieza?",
  "crema de cacahuate":
    "Para no hacernos trampa sin querer: ¿esa cucharada fue medida con cuchara medidora o fue una cucharada copeteada de cocina?",
  chocolate:
    "Aquí el tamaño importa: ¿cuántos gramos o qué tipo de porción (cuadrito, barra, cucharada)?",
  aceite:
    "Antes de contarlo, necesito un dato más: ¿fue cucharadita medida, cucharada sopera o 'al tanteo'?",
  jugo:
    "Antes de contarlo, necesito un dato más: ¿fue vaso chico, mediano, grande o de cuántos ml?",
  nueces:
    "Aquí el tamaño importa: ¿fue puñito cerrado, abierto, con o sin cáscara, o gramos aproximados?",
  "pan dulce":
    "Antes de contarlo, necesito un dato más: ¿concha chica, mediana, grande o más de una pieza?",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function detectAmbiguity(
  input: string,
  precisionMode: "relaxed" | "normal" | "strict" = "normal"
): AmbiguityResult {
  const normalized = normalize(input);
  const detectedFoods = RISKY_FOODS.filter((food) => normalized.includes(normalize(food)));
  const detectedAmbiguity = AMBIGUOUS_PORTION_WORDS.filter((word) =>
    normalized.includes(normalize(word))
  );

  const questions: string[] = [];
  for (const food of detectedFoods) {
    const key = normalize(food);
    if (CLARIFICATION_TEMPLATES[key]) {
      questions.push(CLARIFICATION_TEMPLATES[key]);
    }
  }

  if (detectedAmbiguity.length > 0 && questions.length === 0) {
    questions.push(
      "Ajustemos bien la porción: ¿puedes describir tamaño, cantidad exacta o gramos?"
    );
  }

  const needsClarification =
    precisionMode !== "relaxed" &&
    (detectedFoods.length > 0 || (precisionMode === "strict" && detectedAmbiguity.length > 0));

  if (needsClarification && questions.length > 0) {
    const uniqueQuestions = [...new Set(questions)];
    return {
      status: "requires_clarification",
      message:
        "No lo bloqueo por castigo; lo marco porque puede romper tu adherencia. Antes de generar opciones, necesito aclarar la porción.",
      questions: uniqueQuestions,
      detectedFoods: [...detectedFoods],
      detectedAmbiguity: [...detectedAmbiguity],
    };
  }

  return {
    status: "ok",
    message: "Todo claro para continuar.",
    questions: [],
    detectedFoods: [...detectedFoods],
    detectedAmbiguity: [...detectedAmbiguity],
  };
}
