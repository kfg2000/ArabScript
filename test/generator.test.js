import assert from "assert"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import generate from "../src/generator.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

const fixtures = [
  {
    name: "Hello world",
    source: `
      طبع("Hello World!")؛
    `,
    expected: dedent`
      console.log("Hello World!");
    `,
  },
  {
    name: "name test",
    source: `
      دع عدد؛
      دع ت؛
      دع م؛
      دع رقم؛
      دع ة؛
    `,
    expected: dedent`
      let number;
      let var_1;
      let var_2;
      let number_1;
      let var_3;
    `,
  },
  {
    name: "declaration then assignment and constant",
    source: `
        دع ا؛
        ا = ٢؛
        نوع(ا)؛
        ثابت ب = -ا؛
        طبع(ب)؛
        -(-(ب+ا))==٠؛
        -ا؛
    `,
    expected: dedent`
      let var_1;
      var_1 = 2;
      typeof var_1;
      const var_2 = -(var_1);
      console.log(var_2);
      (-(-((var_2 + var_1))) === 0);
      -(var_1);
    `,
  },  
  {
    name: "multiple declarations",
    source: `
        دع م، خ=١، ج=٣؛
        ثابت اسم=١، ح=١، ض=٣؛
    `,
    expected: dedent`
      let var_1 = undefined, var_2 = 1, var_3 = 3;
      const noun = 1, var_4 = 1, var_5 = 3;
    `,
  },
  {
    name: "Ternary",
    source: `
      متغير اسم = ١>٢ ؟ "خالد" : مجهول؛
      ١>٢ ؟ "خالد" : نل؛
    `,
    expected: dedent`
      let noun = (1 > 2) ? "خالد" : undefined;
      (1 > 2) ? "خالد" : null;
    `,
  },
  {
    name: "small function and while",
    source: `
        دالة العد&التنازلي(عدد){
            طبع("Begin countdown!")؛
            بينما(عدد > ٠){
                طبع(عدد)؛
                عدد--؛
            }
            طبع("Blast off!")؛
        }
        العد&التنازلي(١٠)؛
    `,
    expected: dedent`
      function countdown(number) {
        console.log("Begin countdown!");
        while ((number > 0)) {
          console.log(number);
          number--;
        }
        console.log("Blast off!");
      }
      countdown(10);
    `,
  },
  {
    name: "class",
    source: `
        صنف كلب {
            منشئ(اسم،عمر){
                اسم هذا = اسم؛
                عمر هذا = عمر؛
            }
            دالة بارك(){
                طبع("ووف")؛
            }
            اسم هذا؛
        }
        كلب("خالد"،٧) جديد؛
        دع خالد = كلب("خالد"،٧) جديد؛
        خالد. اسم = "احمد"؛
        خالد. بارك()؛
    `,
    expected: dedent`
      class dog{
        constructor (noun, age){
            this.noun = noun;
            this.age = age;
        }
        function bless() {
            console.log("ووف");
        }
        this.noun;
    }
    new dog("خالد", 7);
    let khaled = new dog("خالد", 7);
    khaled.noun = "احمد";
    khaled.bless();
    `,
  },
  {
    name: "if",
    source: `
        دع ا = ١؛
        لو(ا==٠){
            طبع("١")؛
        }ولو(ا==٢){
            طبع(٣)؛
        }آخر{
            طبع(خطا)؛
        }
    `,
    expected: dedent`
      let var_1 = 1;
      if ((var_1 === 0)) {
        console.log("١");
      } else if ((var_1 === 2)) {
          console.log(3);
      } else {
          console.log(false);
      }
    `,
  },
  {
    name: "while",
    source: `
        دع ا = ٠؛
        بينما(ا<٥){
            لو(ا٪٢==٠){
                استمر؛
            }
            دع ب = ٠؛
            بينما(ب<٥){
                طبع(ا*ب)؛
                ب = ب + ١؛
                لو(ب>ا){
                    قف؛
                }
            }
            ا = ا + ١؛
        }
    `,
    expected: dedent`
      let var_1 = 0;
      while ((var_1 < 5)) {
        if (((var_1 ٪ 2) === 0)) {
            continue;
        }
        let var_2 = 0;
        while ((var_2 < 5)) {
          console.log((var_1 * var_2));
          var_2 = (var_2 + 1);
          if ((var_2 > var_1)) {
            break;
          }
        }
        var_1 = (var_1 + 1);
      }
    `,
  },
  {
    name: "functions",
    source: `
        دع ا = ٠.٥؛
        دالة ولا&شيء(){
            عد؛
        }
        دالة شيء(ا){
            عد ا؛
        }
        دع ب =١ + شيء(ا)؛
        ولا&شيء()؛
    `,
    expected: dedent`
      let var_1 = 0.5;
      function nothing() {
        return;
      }
      function thing(var_1) {
        return var_1;
      }
      let var_2 = (1 + thing(var_1));
      nothing();
    `,
  },
  {
    name: "arrays and objects",
    source: `
        دع ا = [١،٢،٣،٤]؛
        دع ب = {٠:صح، ١:خطا}؛
        طبع(ب[٠]==ا[٢])؛
    `,
    expected: dedent`
      let var_1 = [1,2,3,4];
      let var_2 = {0: true, 1: false};
      console.log((var_2[0] === var_1[2]));
    `,
  },
  {
    name: "for loops",
    source: `
        ل(دع ه = ١؛ ه>١٠؛ه++){
            طبع(ه)؛
            ه--؛
        }
        ل(دع ه = ١؛ ه>١٠؛ه+=٥){
            طبع(ه)؛
            ه+=١؛
        }
        دع ارقام = [١،٢،٣،٤]؛
        ل(رقم ارقام){
            طبع(نوع(رقم))؛
        }
    `,
    expected: dedent`
      for (let var_1 = 1; (var_1 > 10); var_1++) {
        console.log(var_1);
        var_1--;
      }
      for (let var_1 = 1; (var_1 > 10); var_1 += 5) {
        console.log(var_1);
        var_1 += 1;
      }
      let numbers = [1,2,3,4];
      for (const number of numbers) {
          console.log(typeof number);
      }
    `,
  },
  {
    name: "switch",
    source: `
    دع ا؛
    دع ت = ٥؛
    تبديل(ت){
        حالة ١:
            ا= ١؛
            قف؛
        حالة ٢: 
            ا= ٥؛
        حالة ٣: 
            طبع(ت)؛
        خلاف ذلك: ٢+٢؛
    }
    `,
    expected: dedent`
      let var_1;
      let var_2 = 5;
      switch(var_2) {
        case 1:
          var_1 = 1;
          break;
        case 2:
          var_1 = 5;
        case 3:
          console.log(var_2);
        default:
          (2 + 2);
      }
    `,
  },
]

describe("The code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected js output for the ${fixture.name} program`, async () => {
      const actual = await generate(analyze(parse(fixture.source)))
      assert.deepEqual(actual, fixture.expected)
    })
  }
})
