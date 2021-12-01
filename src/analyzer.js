import { Variable, Type, Function } from "./ast.js"
// import * as stdlib from "./stdlib.js"

function must(condition, errorMessage) {
  if (!condition) {
    throw new Error(errorMessage)
  }
}

const check = self => ({
  isNumeric() {
    must(
      [Type.INT, Type.NUMBER, Type.ANY].includes(self.type),
      `Expected a number, found ${self.type.name}`
    )
  },
  isBoolean() {
    must([Type.BOOLEAN, Type.ANY].includes(self.type), `Expected a boolean, found ${self.type.name}`)
  },
  isInteger() {
    must([Type.INT, Type.ANY].includes(self.type), `Expected an integer, found ${self.type.name}`)
  },
  isAnArrayOrDict() {
    must(
      [Type.ARRAY, Type.OBJ, Type.ANY].includes(self.type),
      `Expected an array or object, found ${self.type.name}`
    )
  },
  isDict() {
    must([Type.OBJ, Type.ANY].includes(self.type), "Object expected")
  },
  isIterable() {
    must([Type.ARRAY, Type.OBJ, Type.STRING, Type.ANY].includes(self.type), "Iterable expected")
  },
  isNotAConstant() {
    must(!self.con, `Cannot assign to constant ${self.name}`)
  },
  isInsideALoop() {
    must(self.inLoop, "Breaks and Continues can only appear in a loop")
  },
  isInsideAFunction() {
    must(self.function, "Return can only appear in a function")
  },
  isInsideAClass() {
    must(self.class, "This can only appear in a class")
  },
  isCallable() {
    must([Type.FUNC, Type.ANY].includes(self.type), "Call of non-function")
  },
  isFromAClass() {
    must([Type.CLASS, Type.ANY].includes(self.type), `${self.name} is not a class that exists`)
  },
  areAllDistinct() {
    must(
      new Set(self.map(pair => pair.key)).size === self.length,
      "Keys must be distinct"
    )
  },
})

class Context {
  constructor(parent = null, configuration = {}) {
    // Parent (enclosing scope) for static scope analysis
    this.parent = parent
    // All local declarations. Names map to variable declarations, types, and
    // function declarations
    this.locals = new Map()
    // Whether we are part of a property, so that we know whether to care about look ups
    this.partOfProp = configuration.partOfProp ?? parent?.partOfProp ?? false
    // Whether we are in a loop, so that we know whether breaks and continues
    // are legal here
    this.inLoop = configuration.inLoop ?? parent?.inLoop ?? false
    // Whether we are in a function, so that we know whether a return
    // statement can appear here, and if so, how we typecheck it
    this.function = configuration.function ?? parent?.function ?? null
    // Whether we are setting the parameters so that we dont look up new vars
    // that are being instantiated as a parameter
    this.setParams = configuration.setParams ?? parent?.setParams ?? false
    // Whether we are in a class, so that we know whether a this
    // statement can appear here, and if so, how we typecheck it
    this.class = configuration.class ?? parent?.class ?? null
  }
  isWithinScope(name) {
    // Search "outward" through enclosing scopes
    return this.locals.has(name)
  }
  add(name, entity) {
    if (this.isWithinScope(name)) {
      throw new Error(`Identifier ${name} already declared`)
    }
    this.locals.set(name, entity)
  }
  lookup(typeName) {
    const entity = this.locals.get(typeName) ?? this.locals.get(typeName.name)
    if (entity) {
      return entity
    } else if (this.parent) {
      return this.parent.lookup(typeName)
    }
    throw new Error(`Identifier ${typeName} not declared`)
  }
  newChild(configuration = {}) {
    // Create new (nested) context, which is just like the current context
    // except that certain fields can be overridden
    return new Context(this, configuration)
  }
  getType(types){
      if(types.includes(Type.STRING)||types.includes(Type.ARRAY)||types.includes(Type.OBJ)||types.includes(Type.FUNC)){
        return Type.STRING
      }

      if(types.includes(Type.INT)||types.includes(Type.NUMBER)||types.includes(Type.BOOLEAN)||types.includes(Type.NONE)){
        return Type.NUMBER
      }

      return Type.ANY
  }
  analyze(node) {
    return this[node.constructor.name](node)
  }
  Program(p) {
    p.statements = this.analyze(p.statements)
    return p
  }
  VariableDecInit(d) {
    // Declarations generate brand new variable objects
    d.init = this.analyze(d.init)
    d.variable = new Variable(d.variable.name, d.con, d.init.type)
    this.add(d.variable.name, d.variable)
    return d
  }
  VariableDec(d) {
    // Declarations generate brand new variable objects
    d.identifier = d.identifier.name
    d.variable = new Variable(d.identifier, d.con, Type.NONE)
    this.add(d.variable.name, d.variable)
    return d
  }
  Assignment(s) {
    s.source = this.analyze(s.source)
    s.target = this.analyze(s.target)

    check(s.source).isNotAConstant()
    s.source.type = s.target.type
    return s
  }
  MultDec(m) {
    m.individualDecs.map((dec)=>{
      dec[1] = this.analyze(dec[1])
      dec[0] = new Variable(dec[0].name, m.con, dec[1].type)
      this.add(dec[0].name, dec[0])
      return dec
    })
    return m
  }
  TryCatch(t) {
    let newContext = this.newChild()
    t.tryBody = newContext.analyze(t.tryBody)
    newContext = this.newChild()
    t.catchVar = new Variable(catchVar.name, false, Type.ANY)
    newContext.add(catchVar.name, t.catchVar)
    t.catchBody = newContext.analyze(t.catchBody)
    return t
  }
  Class(c) {
    c.class = new Variable(c.identifier.name, false, Type.CLASS)
    this.add(c.class.name, c.class)

    let newContext = this.newChild({ class: c.class, inLoop: false })
    c.constructorBody = newContext.analyze(c.constructorBody)
    c.body = newContext.analyze(c.body)
    return c
  }
  Constructor(c) {
    let newContext = this.newChild({setParams: true})
    c.params = newContext.analyze(c.params)
    newContext.setParams = false
    c.body = newContext.analyze(c.body)
    return c
  }
  This(e) {
    check(this).isInsideAClass()
    let newContext = this.newChild({ partOfProp: true })
    e.variable = newContext.analyze(e.variable)
    e.type = Type.ANY
    return e
  }
  NewObject(o) {
    o.className = this.analyze(o.className)
    check(o.className).isFromAClass()

    o.args = this.analyze(o.args)
    o.type = Type.OBJ
    return o
  }
  FunctionDec(d) {
    const f = (d.function = new Function(d.identifier.name))
    // When entering a function body, we must reset the inLoop setting,
    // because it is possible to declare a function inside a loop!
    const childContext = this.newChild({ inLoop: false, function: f, setParams: true })
    d.params = childContext.analyze(d.params)
    childContext.setParams = false
    // Add before analyzing the body to allow recursion
    f.type = Type.FUNC
    this.add(f.name, f)
    d.body = childContext.analyze(d.body)
    return d
  }

  Call(c) {
    c.callee = this.analyze(c.callee)
    check(c.callee).isCallable()
    c.args = this.analyze(c.args)
    return c
  }
  IfStatement(s) {
    s.cases.map(c => this.analyze(c))
    s.elseBlock = this.newChild().analyze(s.elseBlock)
    return s
  }
  IfCase(s) {
    s.condition = this.analyze(s.condition)
    check(s.condition).isBoolean()
    s.body = this.newChild().analyze(s.body)
    return s
  }
  WhileStatement(s) {
    s.condition = this.analyze(s.condition)
    check(s.condition).isBoolean()
    s.body = this.newChild({ inLoop: true }).analyze(s.body)
    return s
  }
  ForStatement(s) {
    let newContext = this.newChild({ inLoop: true })
    s.forArgs = newContext.analyze(s.forArgs)
    s.body = newContext.analyze(s.body)
    return s
  }
  ForOfStatement(s) {
    let newContext = this.newChild({ inLoop: true })
    
    s.iterable = this.analyze(s.iterable)
    check(s.iterable).isIterable()
    s.variable = new Variable(s.variable.name, false, Type.ANY)
    newContext.add(s.variable.name, s.variable)

    s.body = newContext.analyze(s.body)
    return s
  }
  ForArgs(s) {
    s.exp = this.analyze(s.exp)
    s.variable = new Variable(s.identifier.name, false, s.exp.type)
    this.add(s.variable.name, s.variable)

    s.condition = this.analyze(s.condition)
    check(s.condition).isBoolean()

    s.sliceCrement = this.analyze(s.sliceCrement)

    return s
  }

  SwitchStatement(s) {
    s.expression = this.analyze(s.expression)
    s.cases.map(c => this.analyze(c))
    s.defaultCase = this.analyze(s.defaultCase)
    return s
  }
  Case(s) {
    s.caseExp = this.analyze(s.caseExp)
    s.statements = this.newChild({ inLoop: true }).analyze(s.statements)
    return s
  }

  ReturnStatement(s) {
    check(this).isInsideAFunction()
    s.returnValue = this.analyze(s.returnValue)
    return s
  }

  ShortReturnStatement(s) {
    check(this).isInsideAFunction()
    return s
  }

  PrintStatement(p){
    p.argument = this.analyze(p.argument)
    return p
  }

  TypeOfOperator(t){
    t.argument = this.analyze(t.argument)
    t.type = Type.STRING
    return t
  }

  Ternary(t){
    t.bool = this.analyze(t.bool)
    check(t.bool).isBoolean()

    t.expIfTrue = this.analyze(t.expIfTrue)
    t.expIfFalse = this.analyze(t.expIfFalse)
    t.type = this.getType([t.expIfTrue.type, t.expIfFalse.type])
    return t
  }

  BinaryExp(e) {
    e.left = this.analyze(e.left)
    e.right = this.analyze(e.right)
    if (["&&", "||"].includes(e.op)) {
      e.type = Type.BOOLEAN
    } else if (["+", "+="].includes(e.op)) {
      if (e.op === "+=") {
        check(e.left).isNotAConstant()
      }
      e.type = this.getType([e.left.type,e.right.type])
    } else if (["-", "*", "/", "%", "**", "-="].includes(e.op)) {
      if (e.op === "-=") {
        check(e.left).isNotAConstant()
      }
      e.type = Type.NUMBER
    } else if (["<", "<=", ">", ">="].includes(e.op)) {
      e.type = Type.BOOLEAN
    } else if (["==", "!="].includes(e.op)) {
      e.type = Type.BOOLEAN
    }
    return e
  }

  UnaryExpression(e) {
    e.operand = this.analyze(e.operand)
    if (["++", "--"].includes(e.op)) {
      check(e.operand).isNotAConstant()
      check(e.operand).isNumeric()
      e.type = e.operand.type
    } else if ("-" === e.op) {
      check(e.operand).isNumeric()
      e.type = e.operand.type
    } else if ("!" === e.op) {
      e.type = Type.BOOLEAN
    }
    return e
  }

  ArrayLit(a) {
    //Check if the literal is empty, then we keep the type it came with.
    // If a.type is undefined we could just assign it to TYPE.any
    a.elements = this.analyze(a.elements)
    a.type = Type.ARRAY
    return a
  }
  
  ObjLit(a) {
    if (a.keyValuePairs.length > 0) {
      a.keyValuePairs = this.analyze(a.keyValuePairs)
      check(a.keyValuePairs).areAllDistinct()
    }
    let keys = new Set(a.keyValuePairs.map(pair => pair.key))
    a.type = Type.OBJ
    a.keys = keys

    return a
  }

  ObjPair(p) {
    p.key = this.analyze(p.key)
    p.value = this.analyze(p.value)
    return p
  }

  MemberExpression(e) {
    e.variable = this.analyze(e.variable)
    check(e.variable).isAnArrayOrDict()
    e.exp = this.newChild({ partOfProp: false }).analyze(e.exp)
    if(e.variable.type == Type.ARRAY){
        check(e.exp).isInteger()
    }
    e.type = Type.ANY
    return e
  }

  PropertyExpression(e) {
    e.object = this.analyze(e.object)
    check(e.object).isDict()

    let newContext = this.newChild({ partOfProp: true })
    e.field = newContext.analyze(e.field)
    e.type = Type.ANY
    return e
  }
  Continue(s) {
    check(this).isInsideALoop()
    return s
  }
  Break(s) {
    check(this).isInsideALoop()
    return s
  }

  IdentifierExpression(e) {
    // Id expressions get "replaced" with the variables they refer to
    e.type = Type.ANY
    if(this.setParams){
      e.variable = new Variable(e.name, false, Type.ANY)
      this.add(e.name, e.variable)
      return e.variable
    }
    return this.partOfProp ? e : this.lookup(e.name)
  }
  Undefined(u) {
    u.type = Type.NONE
    return u
  }
  Null(n) {
    n.type = Type.NONE
    return n
  }
  Bool(b) {
    b.type = Type.BOOLEAN
    return b
  }
  Number(e) {
    return e
  }
  BigInt(e) {
    return e
  }
  String(e) {
    return e
  }
  Array(a) {
    return a.map(item => this.analyze(item))
  }
}

export default function analyze(node) {
  // Allow primitives to be automatically typed
  Number.prototype.type = Type.NUMBER
  BigInt.prototype.type = Type.INT
  Boolean.prototype.type = Type.BOOLEAN
  String.prototype.type = Type.STRING
  const initialContext = new Context()

  // Add in all the predefined identifiers from the stdlib module
//   const library = { ...stdlib.types, ...stdlib.functions }
//   for (const [name, type] of Object.entries(library)) {
//     initialContext.add(name, type)
//   }
  return initialContext.analyze(node)
}
