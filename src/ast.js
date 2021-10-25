import util from "util"


export class Bool {
  constructor(name, value) {
    Object.assign(this, { name, value })
  }
}

export class Program {
  constructor(statements) {
    Object.assign(this, { statements })
  }
  [util.inspect.custom]() {
    return prettied(this)
  }
}

export class VariableDecInit {
  constructor(variable, init, con) {
    Object.assign(this, { con, variable, init })
  }
}

export class VariableDec {
  constructor(type, identifier, con) {
    Object.assign(this, { con, identifier })
  }
}

export class This {
  constructor(variable, exp) {
    Object.assign(this, { variable, exp })
  }
}

export class Assignment {
  constructor(source, target) {
    Object.assign(this, { target, source })
  }
}

export class Class {
  constructor(identifier, constructorBody, body) {
    Object.assign(this, { identifier, constructorBody, body })
  }
}

export class Constructor {
  constructor(params, body) {
    Object.assign(this, { params, body })
  }
}

export class NewObject {
  constructor(className, args) {
    Object.assign(this, { className, args })
  }
}

export class FunctionDec {
  constructor(identifier, params, body) {
    Object.assign(this, { identifier, params, body })
  }
}

export class Call {
  constructor(callee, args) {
    Object.assign(this, { callee, args })
  }
}

export class IfStatement {
  constructor(cases, elseBlock) {
    Object.assign(this, { cases, elseBlock })
  }
}
export class IfCase {
  constructor(condition, body) {
    Object.assign(this, { condition, body })
  }
}

export class WhileStatement {
  constructor(condition, body) {
    Object.assign(this, { condition, body })
  }
}

export class ForStatement {
  constructor(forArgs, body) {
    Object.assign(this, { forArgs, body })
  }
}

export class ForOfStatement {
  constructor(variable, iterable, body) {
    Object.assign(this, { variable, iterable, body })
  }
}

export class ForArgs {
  constructor(identifier, exp, condition, sliceCrement) {
    Object.assign(this, { identifier, exp, condition, sliceCrement })
  }
}


// our version of switch forces the first right case to end the statement,
// so no need for break
export class SwitchStatement {
  constructor(expression, cases, defaultCase) {
    Object.assign(this, { expression, cases, defaultCase })
  }
}

export class Case {
  constructor(caseExp, statements) {
    Object.assign(this, { caseExp, statements })
  }
}

export class PrintStatement {
  constructor(argument) {
    this.argument = argument
  }
}

// move to exp
export class TypeOfOperator {
  constructor(argument) {
    this.argument = argument
  }
}

export class ReturnStatement {
  constructor(returnValue) {
    this.returnValue = returnValue
  }
}

export class ShortReturnStatement {
  constructor() {
    this.returnValue = Type.VOID
  }
}

export class BinaryExp {
  constructor(left, op, right) {
    Object.assign(this, { left, op, right })
  }
}

export class UnaryExpression {
  constructor(op, operand, isprefix) {
    Object.assign(this, { op, operand, isprefix })
  }
}

export class ArrayLit {
  constructor(elements) {
    Object.assign(this, { elements })
  }
}

export class ObjLit {
  constructor(keyValuePairs) {
    Object.assign(this, { keyValuePairs })
  }
}

export class ObjPair {
  constructor(key, value) {
    Object.assign(this, { key, value })
  }
}

export class MemberExpression {
  constructor(variable, exp) {
    Object.assign(this, { variable, exp })
  }
}

export class PropertyExpression {
  constructor(object, field) {
    Object.assign(this, { object, field })
  }
}

export class Continue {}

export class Break {}

export class IdentifierExpression {
  constructor(name) {
    this.name = name
  }
}

// Stolen from Dr Toal, thanks!
function prettied(node) {
  // Return a compact and pretty string representation of the node graph,
  // taking care of cycles. Written here from scratch because the built-in
  // inspect function, while nice, isn't nice enough.
  const tags = new Map()

  function tag(node) {
    if (tags.has(node) || typeof node !== "object" || node === null) return
    tags.set(node, tags.size + 1)
    for (const child of Object.values(node)) {
      Array.isArray(child) ? child.forEach(tag) : tag(child)
    }
  }

  function* lines() {
    function view(e) {
      if (tags.has(e)) return `#${tags.get(e)}`
      if (Array.isArray(e)) return `[${e.map(view)}]`
      return util.inspect(e)
    }
    for (let [node, id] of [...tags.entries()].sort((a, b) => a[1] - b[1])) {
      let [type, props] = [node.constructor.name, ""]
      Object.entries(node).forEach(([k, v]) => (props += ` ${k}=${view(v)}`))
      yield `${String(id).padStart(4, " ")} | ${type}${props}`
    }
  }

  tag(node)
  return [...lines()].join("\n")
}
