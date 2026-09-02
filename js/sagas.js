const AUTH_EMAIL = "raimundoibieta@gmail.com";
const AUTH_HASH = "aed9171def4aaf8f227cecdef7d9a9f8869a3628606da9bafaac328d16ac8e3f";

const SAGAS = [
  {
    title: "El Amanecer de una Leyenda",
    arc: "East Blue",
    span: "Desde Romance Dawn hasta Loguetown",
    story:
      "Luffy se lanza al mar en un barril y reúne a su tripulación fundadora: Zoro, Nami, Usopp y Sanji. Enfrentan a Buggy y Arlong, consiguen el Going Merry y zarpan hacia el Grand Line."
  },
  {
    title: "La Entrada al Grand Line y la Princesa en Peligro",
    arc: "Saga de Alabasta",
    span: "Desde Reverse Mountain hasta Alabasta",
    story:
      "La tripulación entra al Grand Line, conoce a Nefertari Vivi y se cruza con Chopper en Drum. El mes culmina en Alabasta: la guerra civil, la derrota de Crocodile y Chopper como médico oficial."
  },
  {
    title: "Hacia el Cielo y la Lucha contra la Tiranía",
    arc: "Saga de Skypiea",
    span: "Desde Jaya hasta Skypiea y Long Ring Long Land",
    story:
      "Persiguiendo una isla en el cielo, los Sombrero de Paja llegan a Jaya, descubren Skypiea y se enfrentan al Dios Enel. De vuelta al mar azul, el encuentro con el almirante Aokiji deja una amenaza latente."
  },
  {
    title: "El Sacrificio por los Nakamas y el Nuevo Barco",
    arc: "Saga de Water 7 / Enies Lobby",
    span: "Water 7, Enies Lobby y Post-Enies Lobby",
    story:
      "Crisis con Usopp y la aparente traición de Robin. La tripulación declara la guerra al Gobierno Mundial para rescatarla, se despide del Going Merry, se une Franky y nace el Thousand Sunny."
  },
  {
    title: "El Terror del Florian Triangle y la Tragedia en el Archipiélago",
    arc: "Saga de Thriller Bark y Sabaody",
    span: "Thriller Bark, Archipiélago Sabaody y Amazon Lily",
    story:
      "En la isla de los zombis conocen a Brook, que se une como músico. En Sabaody el golpe es devastador: Pacifistas, almirantes y Kuma separan a toda la tripulación."
  },
  {
    title: "La Odisea en solitario y la Guerra de Marineford",
    arc: "Saga de la Cumbre / Impel Down",
    span: "Amazon Lily, Impel Down, Marineford y Post-Guerra",
    story:
      "Luffy se infiltra en Impel Down para salvar a Ace y entra a la Guerra de los Mejores en Marineford. Una pérdida irreparable marca un antes y un después."
  },
  {
    title: "El Entrenamiento de los Dos Años y el Reencuentro",
    arc: "Saga de la Isla Gyojin",
    span: "El salto temporal (3D2Y) y la Isla Gyojin",
    story:
      "Tras el mensaje 3D2Y, cada nakama entrena dos años. Se reencuentran más fuertes en Sabaody y descienden al fondo del mar para liberar la Isla Gyojin de Hody Jones."
  },
  {
    title: "Alianzas, Dragones y el Infierno de Doflamingo",
    arc: "Saga de Punk Hazard y Dressrosa",
    span: "Punk Hazard y Dressrosa",
    story:
      "Alianza con Trafalgar Law. En Punk Hazard detienen a Caesar Clown; en Dressrosa liberan el reino de Doflamingo y nace la Gran Flota de Sombrero de Paja."
  },
  {
    title: "La Búsqueda de Sanji y el País de los Samuráis",
    arc: "Whole Cake Island y Wano · Parte 1",
    span: "Zou, Whole Cake Island e inicio de Wano",
    story:
      "Parte de la tripulación se infiltra en el territorio de Big Mom para rescatar a Sanji. Luego todos se reagrupan en Wano para preparar la rebelión contra el shogun."
  },
  {
    title: "La Guerra por la Liberación",
    arc: "Saga de Wano · Conclusión",
    span: "El clímax de Onigashima",
    story:
      "La batalla de Onigashima. Luffy despierta Gear 5, derrota a Kaido, abre las fronteras de Wano y queda consolidado como uno de los nuevos Yonko."
  },
  {
    title: "El Misterio del Siglo Vacío y la Isla del Futuro",
    arc: "Saga de Egghead",
    span: "El arco de Egghead",
    story:
      "En la isla de Vegapunk se revelan verdades sobre las Frutas del Diablo, el Siglo Vacío y el Gobierno Mundial. El asedio global llega con la intervención de los Gorosei."
  },
  {
    title: "Hacia la Recta Final y el Nuevo Horizonte",
    arc: "Elbaf / Rumbo a Laugh Tale",
    span: "Transición a la saga final",
    story:
      "Cierre del año en la tierra de los gigantes y rumbo a Laugh Tale. El terreno queda listo para el desenlace… y para mirar atrás un año de metas cumplidas."
  }
];

const QUARTERS_LORE = [
  {
    name: "Rumbo al cielo",
    blurb: "East Blue, Alabasta y Skypiea: armar la tripulación, entrar al Grand Line y tocar las nubes."
  },
  {
    name: "Guerra y sacrificio",
    blurb: "Water 7, Sabaody y Marineford: pelear por los nakamas, perder el rumbo y nacer de nuevo."
  },
  {
    name: "Reencuentro y alianzas",
    blurb: "Isla Gyojin, Dressrosa y Whole Cake: volver más fuertes, formar flota y recuperar a Sanji."
  },
  {
    name: "Emperador y horizonte",
    blurb: "Wano, Egghead y Elbaf: Gear 5, el Siglo Vacío y la recta final hacia Laugh Tale."
  }
];

const MOODS = [
  { id: "1", label: "Zzz", desc: "Relajado" },
  { id: "2", label: "Alegre", desc: "Con energía" },
  { id: "3", label: "En duda", desc: "Preocupado" },
  { id: "4", label: "Fuego", desc: "Furioso" },
  { id: "5", label: "A luchar", desc: "Determinado" }
];

const NAKAMAS = [
  { id: "luffy", name: "Luffy" },
  { id: "zoro", name: "Zoro" },
  { id: "nami", name: "Nami" },
  { id: "usopp", name: "Usopp" },
  { id: "sanji", name: "Sanji" },
  { id: "chopper", name: "Chopper" },
  { id: "robin", name: "Robin" },
  { id: "franky", name: "Franky" },
  { id: "brook", name: "Brook" },
  { id: "jinbe", name: "Jinbe" },
  { id: "ace", name: "Ace" },
  { id: "sabo", name: "Sabo" }
];

const MONTH_CHAR = [
  { id: "luffy", name: "Luffy" },
  { id: "nami", name: "Nami" },
  { id: "usopp", name: "Usopp" },
  { id: "robin", name: "Robin" },
  { id: "brook", name: "Brook" },
  { id: "ace", name: "Ace" },
  { id: "jinbe", name: "Jinbe" },
  { id: "law", name: "Law" },
  { id: "sanji", name: "Sanji" },
  { id: "zoro", name: "Zoro" },
  { id: "franky", name: "Franky" },
  { id: "sabo", name: "Sabo" }
];
