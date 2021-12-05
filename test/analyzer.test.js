import assert from "assert"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"

// Programs that are semantically correct
const semanticChecks = [
  ["constant declarations", "ثابت ط = -(١.١**٢)-٣٩/٢٣؛"],
  ["variable declarations", "متغير اسم = \"خالد\"؛"],
  ["variable declarations 2", "دع طس&شش؛"],
  ["mult variable declarations", "دع م، خ=١، ج=٣؛"],
  ["mult variable const declarations", "ثابت م=١، خ=١، ج=٣؛"],
  ["variable declarations of null", "دع طس&شش = نل؛"],
  ["variable declarations of undefined", "دع طس&شش = مجهول؛"],
  ["assignment", "دع طس&شش؛ طس&شش = ٢؛"],
  ["ternary declaration", "متغير اسم = ١>٢ ؟ \"خالد\" : مجهول؛"],
  ["object declaration", "دع اري = {١:٢،\"١١١\":١٠}؛"],
  ["array declaration", "دع اري = [١،٢،٣،٤،٥]؛"],
  ["using member exp on an array", "دع اري = [١،٢،٣،٤،٥]؛ اري[١]؛"],
  ["using member exp", "دع دكش = {١:٢،\"عشرا\":١٠}؛ دكش[\"عشرا\"]+ دكش.عشرا؛"],
  ["using complex member exp", "دع دكش = {١:٢،\"عشرا\":[١،٢]}؛ دكش.عشرا[٠]؛"],
  ["increment and decrement", "دع ا = ١؛ ا++؛ ا--؛ ا+=١؛ ا-=١؛"],
  [
    "Try Catch",
    "{ دع ا = ١؛ } مسك(ب){ طبع(ب)؛ }",
  ],
  [
    "Class Definition",
    "صنف كلب { }",
  ],
  [
    "Class Definition with contructor",
    "صنف كلب { منشئ(اسم،عمر){ اسم هذا = اسم؛ عمر هذا = عمر؛ } }",
  ],
  [
    "Class Definition with contructor and body",
    "صنف كلب { منشئ(اسم،عمر){ اسم هذا = اسم؛ عمر هذا = عمر؛ } دالة بارك(ا،ب){ عد ا؛ } }",
  ],
  [
    "New Object",
    "صنف كلب { منشئ(اسم،عمر){ اسم هذا = اسم؛ عمر هذا = عمر؛ } دالة بارك(ا،ب){ عد ا؛ } } دع خالد = كلب(\"خالد\"،٧) جديد؛",
  ],
  [
    "Function Definition",
    "دالة بارك(){}",
  ],
  [
    "Function Definition with params",
    "دالة بارك(ا،ب){}",
  ],
  [
    "Function Definition with empty return",
    "دالة بارك(ا،ب){ عد؛ }",
  ],
  [
    "Function Definition with return",
    " دالة بارك(ا،ب){ عد ا؛ }",
  ],
  [
    "Function call",
    " دالة بارك(ا،ب){ عد ا؛ } بارك(١،٢)؛",
  ],
  [
    "If statement",
    "دع ط = ١**٢-٣٩/٢٣؛ متغير اسم = \"خالد\"؛ لو(ط>٠){ ط=٠؛}",
  ],
  [
    "ِElse If statement",
    "دع ط = ١**٢-٣٩/٢٣؛ متغير اسم = \"خالد\"؛ لو(ط>٠){ ط=٠؛} ولو(اسم == \"بدر\"){ اسم = \"خالد\"؛}",
  ],
  [
    "ِElse statement",
    "دع ط = ١**٢-٣٩/٢٣؛ متغير اسم = \"خالد\"؛ لو(ط>٠){ ط=٠؛} ولو(اسم == \"بدر\"){ اسم = \"خالد\"؛}  آخر{ اسم = \"خالد\" + ط؛ }",
  ],
  [
    "While condition with continue",
    "بينما(!(١>٢)){ استمر؛ }",
  ],
  [
    "Complex While condition with break",
    "متغير بول = صح؛ بينما(!(١>٢)&&بول){ بول = خطا؛ قف؛ }",
  ],
  [
    "For with args",
    "ل(دع ه = ١؛ ه>٠؛ه++){ ه += ٣؛ }",
  ],
  [
    "For of",
    "دع ه؛ دع ارقام = [١،٢،٣،٤]؛ ل(رقم ارقام){ ه += رقم؛ }",
  ],
  [
    "Switch Statement",
    "دع ت = ٤؛ تبديل(ت){ حالة ١: حالة ٢: حالة ٣: ١+١؛ خلاف ذلك: ٢+٢؛ }",
  ],
  ["Print logical or", "طبع(١>٢||صح)؛"],
  ["Typeof logical &&", "نوع(١>٢&&صح)؛"],
]

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["undeclared id", "نوع(ا)؛", /Identifier ا not declared/],
  ["redeclared id", "دع ا = ١؛ دع ا = ٢؛", /Identifier ا already declared/],
  ["assign to const", "ثابت ا = ١؛ ا = ٢؛", /Cannot assign to constant ا/],
  [
    "unary increment to const",
    "ثابت ا = ١؛ ا++؛",
    /Cannot assign to constant ا/,
  ],
  [
    "binary increment to const",
    "ثابت ا = ١؛ ا+=١؛",
    /Cannot assign to constant ا/,
  ],
  [
    "unary decrement to const",
    "ثابت ا = ١؛ ا--؛",
    /Cannot assign to constant ا/,
  ],
  [
    "binary decrement to const",
    "ثابت ا = ١؛ ا-=١؛",
    /Cannot assign to constant ا/,
  ],
  [
    "unary negation to string",
    "دع ا = \"١\"؛ -ا؛",
    /Expected a number, found string/,
  ],
  [
    "uncallabled variable",
    "دع اسم = ١؛ اسم()؛",
    /Call of non-function/,
  ],
  [
    "This statement outside of class",
    " اسم هذا = اسم؛",
    /This can only appear in a class/,
  ],
  [
    "New object declaration of non object",
    " دع ا = ١؛ ا() جديد؛",
    /ا is not a class that exists/,
  ],
  ["break outside loop", "قف؛", /Breaks and Continues can only appear in a loop/],
  ["continue outside loop", "استمر؛", /Breaks and Continues can only appear in a loop/],
  [ "return nothing outside function", "عد؛", /Return can only appear in a function/ ],
  [ "return something outside function", "عد ١؛", /Return can only appear in a function/ ],
  [
    "non-boolean short if test",
    "لو(٠){}",
    /Expected a boolean, found int/,
  ],
  [
    "non-boolean else if test",
    "لو(صح){}ولو(٠){}",
    /Expected a boolean, found int/,
  ],
  [
    "non-boolean while test",
    "بينما(٠){}",
    /a boolean, found int/,
  ],
  [
    "non-boolean for test",
    "ل(دع ه = ١؛٠؛ه++){}",
    /a boolean, found int/,
  ],
  [
    "non-iterable for of test",
    "دع ارقام = ١؛ ل(رقم ارقام){}",
    /Iterable expected/,
  ],
  [
    "non-boolean ternary test",
    "متغير اسم = ١ ؟ \"خالد\" : مجهول؛",
    /a boolean, found int/,
  ],
  [
    "Object doesnt have unique keys",
    "دع ا = {١:١، ١:٢}؛",
    /Keys must be distinct/,
  ],
  [
    "Member exp for non array/object",
  " دع اري = ١؛ اري[٠]؛",
    /Expected an array or object, found int/,
  ],
  [
    "Member exp for array isnt an integer",
    "دع ا = \"\"؛ دع اري = [١،٢،٣،٤،٥]؛ اري[ا]؛",
    /Expected an integer, found string/,
  ],
  [
    "Property exp for non object",
    "دع اري = ١؛ اري.ا؛",
    /Object expected/,
  ],
]

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
})
