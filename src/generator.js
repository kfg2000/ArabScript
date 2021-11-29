// Code Generator arabScript -> JavaScript
//
// Invoke generate(program) with the program node to get back the JavaScript
// translation as a string.

import request from 'request';

export default async function generate(program) {
  let options = {
        method: 'GET',
        url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
        qs: {text: 'Hi', to: 'en', from: 'ar'},
        headers: {
            'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
            'x-rapidapi-key': '1cd79a6af9msh64d71fa9d63ea8dp1f72b3jsn5e9f790a3ac7',
            useQueryString: true
        }
  };
  const output = []
  const arToen = new Map()
  let current_count = 1;
  let expStandalone = true


const getName = (entity) => {
  return new Promise(function (resolve, reject) {
    request(options, function (error, response, body) {
        const parsed = JSON.parse(body)
        const english = /^[A-Za-z0-9]*$/;
        if(parsed.status === 200 && parsed.translated_text["en"] !== "NS" && english.test(parsed.translated_text["en"])){
            let varName = parsed.translated_text["en"].toLowerCase().replace(/ |&/g, '_')
            arToen.set(entity.name, varName)
        } else {
            arToen.set(entity.name, "var_"+current_count)
            current_count++
        }
        resolve(body)
    });
  });
}
  const targetName = async (entity) => {
      if(!arToen.has(entity.name)){
        options.qs.text = entity.name
        await getName(entity)
      }
      return `${arToen.get(entity.name)}`
  }

  const gen = async (node) => {
    // console.log(node)
    return await generators[node.constructor.name](node)
  }

  const generators = {
    // Key idea: when generating an expression, just return the JS string; when
    // generating a statement, write lines of translated JS to the output array.

    async Program(p) {
      await gen(p.statements)
    },
    async VariableDecInit(d) {
      expStandalone = false
      output.push(`${d.con ? 'const' : 'let'} ${await gen(d.variable)} = ${await gen(d.init)};`)
      expStandalone = true
    },
    async VariableDec(d) {
      expStandalone = false
      output.push(`let ${await gen(d.variable)};`)
      expStandalone = true
    },
    async Assignment(s) {
      expStandalone = false
      output.push(`${await gen(s.source)} = ${await gen(s.target)};`)
      expStandalone = true
    },
    async MultDec(m) {
      expStandalone = false
      let outputString = `${m.con ? 'const' : 'let'} `
      let length = m.individualDecs.length
      for(let i = 0; i < length-1; i++){
        outputString += `${await gen(m.individualDecs[i][0])} = ${await gen(m.individualDecs[i][1])}, `
      }
      outputString += `${await gen(m.individualDecs[length-1][0])} = ${await gen(m.individualDecs[length-1][1])};`
      output.push(outputString)
      expStandalone = true
    },
    async Class(c) {
        const className = await targetName(c.class)
        output.push(`class ${className}{`)
        await gen(c.constructorBody)
        await gen(c.body)
        output.push(`}`)
    },
    async Constructor(c) {
        output.push(`constructor (${(await gen(c.params)).join(", ")}){`)
        await gen(c.body)
        output.push(`}`)
    },
    async This(e) {
        const name = await targetName(e.variable)
        if (expStandalone) {
            expStandalone = false
            output.push(`this.${name};`)
            expStandalone = true
        } else {
            return `this.${name}`
        }
    },
    async NewObject(o) {
        const className = await targetName(o.className)
        if (expStandalone) {
            expStandalone = false
            output.push(`new ${className}(${(await gen(o.args)).join(", ")});`)
            expStandalone = true
        } else {
            return `new ${className}(${(await gen(o.args)).join(", ")})`
        }
    },
    async FunctionDec(f) {
      const funcName = await targetName(f.function)
      output.push(`function ${funcName}(${(await gen(f.params)).join(", ")}) {`)
      await gen(f.body)
      output.push("}")
    },
    async Call(c) {
      const targetCode = `${await gen(c.callee)}(${(await gen(c.args)).join(", ")})`
      if (expStandalone) {
            expStandalone = false
            output.push(`${targetCode};`)
            expStandalone = true
        } else {
            return targetCode
        }
    },
    async Function(f) {
      return await targetName(f)
    },
    async PrintStatement(p) {
      expStandalone = false
      output.push(`console.log(${await gen(p.argument)});`)
      expStandalone = true
    },
    async TypeOfOperator(p) {
      if (expStandalone) {
        expStandalone = false
        output.push(`typeof ${await gen(p.argument)};`)
        expStandalone = true
      } else {
        return `typeof ${await gen(p.argument)}`
      }
    },
    async IfStatement(s) {
      expStandalone = false
      output.push(`if (${await gen(s.cases[0].condition)}) {`)
      expStandalone = true
      await gen(s.cases[0].body)
      for (let i = 1; i < s.cases.length; i++) {
        await gen(s.cases[i])
      }
      if(s.elseBlock.length !== 0){
        output.push(`} else {`)
        await gen(s.elseBlock)
      }
      output.push(`}`)
    },
    async IfCase(s) {
      expStandalone = false
      output.push(`} else if (${await gen(s.condition)}) {`)
      expStandalone = true
      await gen(s.body)
    },
    async WhileStatement(s) {
      expStandalone = false
      output.push(`while (${await gen(s.condition)}) {`)
      expStandalone = true
      await gen(s.body)
      output.push("}")
    },
    async ForStatement(s) {
      await gen(s.forArgs)
      await gen(s.body)
      output.push("}")
    },
    async ForOfStatement(s) {
      const iterable = await targetName(s.iterable)
      const variable = await targetName(s.variable)
      output.push(
        `for (const ${variable} of ${iterable}) {`
      )
      await gen(s.body)
      output.push("}")
    },
    async ForArgs(s) {
      expStandalone = false
      output.push(
        `for (let ${await gen(s.variable)} = ${await gen(s.exp)}; ${await gen(s.condition)}; ${await gen(
          s.sliceCrement
        )}) {`
      )
      expStandalone = true
    },
    async SwitchStatement(s) {
      output.push(`switch(${await gen(s.expression)}) {`)
      for (let i = 0; i < s.cases.length; i++) {
        await gen(s.cases[i])
      }
      output.push(`default:`)
      await gen(s.defaultCase)
      output.push(`}`)
    },
    async Case(s) {
      output.push(`case ${await gen(s.caseExp)}:`)
      await gen(s.statements)
    },
    async ReturnStatement(s) {
      expStandalone = false
      output.push(`return ${await gen(s.returnValue)};`)
      expStandalone = true
    },
    ShortReturnStatement(s) {
      output.push("return;")
    },
    async Ternary(e){
      if (expStandalone) {
        expStandalone = false
        output.push(`${await gen(e.bool)} ? ${await gen(e.expIfTrue)} : ${await gen(e.expIfFalse)};`)
        expStandalone = true
        return
      }
      return `${await gen(e.bool)} ? ${await gen(e.expIfTrue)} : ${await gen(e.expIfFalse)}`
    },
    async BinaryExp(e) {
      const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op

      if (["+=", "-="].includes(e.op)) {
        if (expStandalone) {
          expStandalone = false
          output.push(`${await gen(e.left)} ${op} ${await gen(e.right)};`)
          expStandalone = true
          return
        }
        return `${await gen(e.left)} ${op} ${await gen(e.right)}`
      }
      if (expStandalone) {
        expStandalone = false
        output.push(`(${await gen(e.left)} ${op} ${await gen(e.right)});`)
        expStandalone = true
        return
      }
      return `(${await gen(e.left)} ${op} ${await gen(e.right)})`
    },
    async UnaryExpression(e) {
      if (expStandalone) {
        if (e.isprefix) {
          expStandalone = false
          output.push(`${e.op}(${await gen(e.operand)});`)
          expStandalone = true
          return
        }
        expStandalone = false
        output.push(`${await gen(e.operand)}${e.op};`)
        expStandalone = true
        return
      }
      if (e.isprefix) {
        return `${e.op}(${await gen(e.operand)})`
      }
      return `${await gen(e.operand)}${e.op}`
    },
    async ArrayLit(a) {
      return `[${(await gen(a.elements)).join(",")}]`
    },
    async ObjLit(o) {
      return `{${(await gen(o.keyValuePairs)).join(", ")}}`
    },
    async ObjPair(p) {
      return `${await gen(p.key)}: ${await gen(p.value)}`
    },
    async MemberExpression(e) {
      return `${await gen(e.variable)}[${await gen(e.exp)}]`
    },
    async PropertyExpression(e) {
      return `${await gen(e.object)}.${await gen(e.field)}`
    },
    Continue(s) {
      output.push("continue;")
    },
    Break(s) {
      output.push("break;")
    },
    async Variable(v) {
      return await targetName(v)
    },
    async IdentifierExpression(v) {
      return await targetName(v)
    },
    Bool(b) {
      return `${b.value}`
    },
    Number(e) {
      return e
    },
    BigInt(e) {
      return e
    },
    String(e) {
      // This ensures in JavaScript they get quotes!
      return JSON.stringify(e)
    },
    async Array(a) {
      let generatedArray = []
      for(const item of a){
          generatedArray.push(await gen(item))
      }
      return generatedArray
    },
    Undefined(u){
        return `undefined`
    },
    Null(u){
        return `null`
    }
  }

  await gen(program)
  return output.join("\n")
}
