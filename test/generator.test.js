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
//   {
//     name: "medium sized program",
//     source: `
//       When life gives you lemons try slice sumOfSequence( slice seqLength )
//           BEGIN JUICING
//           slice sum = 0
//           forEachLemon (slice i = 1; i < seqLength; i++)
//               BEGIN JUICING
//               sum = sum + i
//               END JUICING
//           you get lemonade and sum
//           END JUICING
//       slice sum = sumOfSequence(7)
//       pour(sum)
//       taste isEven = sum % 2 == 0
//       Pick (isEven)
//           BEGIN JUICING
//           lemonCase sweet
//               pour("the sum is even!")
//               chop
//           lemonCase sour
//               pour("the sum is odd!")
//               chop
//           citrusLimon
//               pour("How?")
//           END JUICING
//       When life gives you lemons try noLemon countdown( slice total )
//           BEGIN JUICING
//           pour("Begin countdown!")
//           Drink the lemonade while (total > 0)
//               BEGIN JUICING
//               pour(total)
//               total--
//               END JUICING
//           pour("Blast off!")
//           END JUICING
//       countdown(sum)
//     `,
//     expected: dedent`
//       function sumOfSequence_1(seqLength_2) {
//         let sum_3 = 0;
//         for (let i_4 = 1; (i_4 < seqLength_2); i_4++) {
//           sum_3 = (sum_3 + i_4);
//         }
//         return sum_3;
//       }
//       let sum_5 = sumOfSequence_1(7);
//       console.log(sum_5);
//       let isEven_6 = ((sum_5 % 2) === 0);
//       switch(isEven_6) {
//         case true:
//           console.log("the sum is even!");
//           break;
//         case false:
//           console.log("the sum is odd!");
//           break;
//         default:
//           console.log("How?");
//       }
//       function countdown_7(total_8) {
//         console.log("Begin countdown!");
//         while ((total_8 > 0)) {
//           console.log(total_8);
//           total_8--;
//         }
//         console.log("Blast off!");
//       }
//       countdown_7(sum_5);
//     `,
//   },
//   {
//     name: "very small",
//     source: `
//       slice x = 10 * 2
//       x++
//       x += 1
//       pour(species(x))
//       -x
//     `,
//     expected: dedent`
//       let x_1 = (10 * 2);
//       x_1++;
//       x_1 += 1;
//       console.log(typeof x_1);
//       -(x_1);
//     `,
//   },
//   {
//     name: "small",
//     source: `
//       slice x = 10 * 2
//       x++
//       x--
//       taste y = sweet
//       y = 5 ^ -x / -100 > - x || sour
//       pour((y && y) || sour || (x*2) != 5)
//     `,
//     expected: dedent`
//       let x_1 = (10 * 2);
//       x_1++;
//       x_1--;
//       let y_2 = true;
//       y_2 = ((((5 ** -(x_1)) / -(100)) > -(x_1)) || false);
//       console.log((((y_2 && y_2) || false) || ((x_1 * 2) !== 5)));
//     `,
//   },
  {
    name: "declaration then assignment and constant",
    source: `
        دع ا؛
        ا = ٢؛
        نوع(ا)؛
        ثابت ب = -ا؛
        طبع(ب)؛
        -(-(ب+ا))==٠؛
    `,
    expected: dedent`
      let var_1;
      var_1 = 2;
      typeof var_1;
      const var_2 = -(var_1);
      console.log(var_2);
      (-(-((var_2 + var_1))) === 0);
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
      function var_1(var_2) {
        console.log("Begin countdown!");
        while ((var_2 > 0)) {
          console.log(var_2);
          var_2--;
        }
        console.log("Blast off!");
      }
      var_1(10);
    `,
  },
  {
    name: "class",
    source: `
        صنف كلب {
            منشئ(اسم،عمر){
                اسم.هذا = اسم؛
                عمر.هذا = عمر؛
            }
            دالة بارك(){
                طبع("ووف")؛
            }
        }
        دع خالد = كلب("خالد"،٧) جديد؛
        خالد. اسم = "احمد"؛
        خالد. بارك()؛
    `,
    expected: dedent`
      class var_1{
        constructor (var_2, var_3){
            this.property_1 = var_2;
            this.property_2 = var_3;
        }
        function var_4() {
            console.log("ووف");
        }
    }
    let var_5 = new var_1("خالد", 7);
    var_5.property_3 = "احمد";
    var_5.property_4();
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
        دع ب = شيء(ا)؛
        ولا&شيء()؛
    `,
    expected: dedent`
      let var_1 = 0.5;
      function var_2() {
        return;
      }
      function var_3(var_4) {
        return var_4;
      }
      let var_5 = var_3(var_1);
      var_2();
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
//   {
//     name: "for loops",
//     source: `
//         forEachLemon (slice i = 0; i < 5; i++)
//             BEGIN JUICING
//             pour(i)
//             nextLemon
//             END JUICING
//         forEachLemon (slice i = 0; i < 5; i+=2)
//             BEGIN JUICING
//             pour(i)
//             END JUICING
//     `,
//     expected: dedent`
//       for (let i_1 = 0; (i_1 < 5); i_1++) {
//         console.log(i_1);
//         continue;
//       }
//       for (let i_2 = 0; (i_2 < 5); i_2 += 2) {
//         console.log(i_2);
//       }
//     `,
//   },
//   {
//     name: "switch",
//     source: `
//     slice number = 2
//     Pick (number)
//         BEGIN JUICING
//         lemonCase 2
//             pour("its even")
//             chop
//         lemonCase 1
//             pour("its odd")
//             chop
//         citrusLimon
//             pour("je ne sais pas")
//         END JUICING
//     `,
//     expected: dedent`
//       let number_1 = 2;
//       switch(number_1) {
//         case 2:
//           console.log("its even");
//           break;
//         case 1:
//           console.log("its odd");
//           break;
//         default:
//           console.log("je ne sais pas");
//       }
//     `,
//   },
]

describe("The code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected js output for the ${fixture.name} program`, () => {
      const actual = generate(analyze(parse(fixture.source)))
      assert.deepEqual(actual, fixture.expected)
    })
  }
})