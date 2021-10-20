// Parser
//
// Exports a default function mapping the source code as a string to the AST.

import ohm from "ohm-js"
//import * as ast from "./ast.js"

const lemonScriptGrammar = ohm.grammar(String.raw`arabScript {
    Program               = Statement*
    Statement             = varKeyword id "="  Exp "؛"                                              --varDecInit
                            | varKeyword id "؛"                                                     --varDec
                            | Var "=" Exp "؛"   												    --assignExp
                            | SwitchStatement
                         	| FunctionCall "؛" 														--functionCall 
                            | ReturnStatement "؛" 													--return
                         	| FunctionDec
                            | IfStatement
                            | WhileStatement
                            | ForStatement
                            | continue "؛" 															--continue
                            | break "؛" 															--break
                            | Exp "؛" 																--exp
    BeginToEnd			  = "{" Statement* "}"
    FunctionCall          = Var "(" Arguments ")"
    FunctionDec           = functionKeyword id "(" Parameters ")" BeginToEnd
    ReturnStatement       = returnKeyword Exp?
    IfStatement			  = ifKeyword "(" Exp ")" BeginToEnd ElseifStatement* ElseStatement?
    ElseifStatement       = elseifKeyword "(" Exp ")" BeginToEnd
    ElseStatement         = elseKeyword BeginToEnd

    WhileStatement        = whileKeyword "(" Exp ")" BeginToEnd

	ForStatement          = forKeyword "(" ForArgs ")" BeginToEnd									 --forArgs
    					  | forKeyword "(" id Var ")" BeginToEnd									 --forOf
    ForArgs               = varKeyword id "=" Exp "؛" Exp "؛" SliceCrement
    SliceCrement          = (id "+=" AddOp | id "-=" AddOp )                                         --binary
                            | (id"++" | id"--" )                                                     --postfix
    SwitchStatement       = switchKeyword "("Var")" "{" Case+ Defaultcase? "}"
    Case             	  = caseKeyword Exp ":" Statement*
    Defaultcase           = defaultKeyword ":" Statement*


    Exp                   = Exp logop Joint                                                          --binary
                            | Joint
    Joint                 = Joint relop AddOp                                                        --binary
                            | AddOp
    AddOp                 = AddOp addop Term                                                         --binary
                            | Term
    Term                  = Term mulop Exponential                                                   --binary
                            | Exponential
    Exponential           = Factor "**" Exponential                                                  --binary
                            | Factor
    Factor                = FunctionCall
							| ("-") Factor                                                           --negation
                            | ("!") Factor                                                           --boolNegation
                            | "(" Exp ")"                                                            --parens
                            | "[" Arguments "]"                                                      --arrayLit
                            | "{" DictValues "}" 													--objLit
                            | numlit
                            | stringlit
                            | boollit
                            | Var
    digit				  += "١"|"٧"|"٦"|"٥"|"٤"|"٣"|"٢"|"٩"|"٠"
    numlit                = digit+ "." digit+                                                        --float
                            | digit+                                                                 --int
    boollit               = "صح" | "خطا"
    stringlit             = "\"" char* "\""
    char                  = "\\n"
                            | "\\'"
                            | "\\\""
                            | "\\\\"
                            | "\\u{" hexDigit hexDigit? hexDigit? hexDigit? hexDigit? hexDigit?  "}"  --hex
                            | ~"\"" ~"\\" any
    Var                   = Property
    						| id
    Property              = Var "." Var                                                                 --dotMemberExp
                            | Var "["Exp"]" 															--memberExp
    varKeyword            = "دع" | "ثابت" | "متغير"
    keyword               = varKeyword | boollit | break | caseKeyword | defaultKeyword | elseKeyword
                            | elseifKeyword | forKeyword | functionKeyword | ifKeyword | returnKeyword
                            | switchKeyword | whileKeyword | continue
    id                    = ~keyword letter (alnum | "&" | "-")*


    break                 = "قف" ~alnum
    continue              = "استمر" ~alnum
    caseKeyword           = "حالة" ~alnum
    defaultKeyword        = "خلاف ذلك" ~alnum
    elseKeyword           = "آخر" ~alnum
    elseifKeyword         = "ولو" ~alnum
    forKeyword            = "ل" ~alnum
    functionKeyword       = "دالة" ~alnum
    ifKeyword             = "لو" ~alnum
    returnKeyword         = "عد" ~alnum
    switchKeyword         = "تبديل" ~alnum
    whileKeyword          = "بينما" ~alnum


    Arguments             = ListOf<Exp, ",">
    Parameters            = ListOf<id, ",">
    DictValues            = ListOf<KeyValue, ",">
    KeyValue              = Exp ":" Exp

    space                 += "//" (~"\n" any)* ("\n" | end)                                               --comment
    logop                 = "&&" | "||"
    relop                 = "<=" | "<" | "==" | "!=" | ">=" | ">"
    addop                 = "+" | "-"
    mulop                 = "*"| "/"| "%"
  }`)


const astBuilder = lemonScriptGrammar.createSemantics().addOperation("tree", {
  Program(statements) {
    return new ast.Program(statements.tree())
  },
  Statement_varDecInit(varType, identifiers, _eq, exp, _end) {
    return new ast.VariableDecInit(
      identifiers.tree(),
      exp.tree(),
      varType.tree().sourceString == "ثابت"
    )
  },
  Statement_varDec(varType, identifier, _end) {
    return new ast.VariableDec(identifier.tree(), varType.tree().sourceString == "ثابت")
  },
  Statement_assignExp(variable, _eq, exp, _end) {
    return new ast.Assignment(variable.tree(), exp.tree())
  },
  BeginToEnd(_left, statements, _right) {
    return statements.tree()
  },
  FunctionDec(_functionBeginning, name, _left, parameters, _right, body) {
    return new ast.FunctionDec(
      name.tree(),
      parameters.tree(),
      body.tree()
    )
  },
  FunctionCall(callee, _left, args, _right) {
    return new ast.Call(callee.tree(), args.tree())
  },
  IfStatement(_ifBeginning, _left, condition, _right, ifBlock, cases, elseBlock) {
    return new ast.IfStatement(
      [new ast.IfCase(condition.tree(), ifBlock.tree()), ...cases.tree()],
      elseBlock.tree()
    )
  },
  ElseifStatement(_elifBeginning, _left, condition, _right, elifBlock) {
    return new ast.IfCase(condition.tree(), elifBlock.tree())
  },
  ElseStatement(_elseBeginning, elseBlock) {
    return elseBlock.tree()
  },
  WhileStatement(_whileBeginning, _left, test, _right, body) {
    return new ast.WhileStatement(test.tree(), body.tree())
  },
  ForStatement_forArgs(_forBeginning, _left, forArgs, _right, body) {
    return new ast.ForStatement(forArgs.tree(), body.tree())
  },
  ForStatement_forOf(_forBeginning, _left, variable, iterable, _right, body) {
    return new ast.ForOfStatement(variable.tree(), iterable.tree(), body.tree())
  },
  ForArgs(_varType, name, _eq, exp, _semi1, condition, _semi2, sliceCrement) {
    return new ast.ForArgs(name.tree(), exp.tree(), condition.tree(), sliceCrement.tree())
  },
  SliceCrement_binary(variable, op, exp) {
    return new ast.BinaryExp(variable.tree(), op.sourceString, exp.tree())
  },
  SliceCrement_postfix(variable, op) {
    return new ast.UnaryExpression(op.sourceString, variable.tree(), false)
  },
  SwitchStatement(_switch, _left, exp, _right, _open, cases, defaultCase, _close) {
    return new ast.SwitchStatement(exp.tree(), cases.tree(), defaultCase.tree())
  },
  Case(_caseKeyword, exp, _semi, statements) {
    return new ast.Case(exp.tree(), statements.tree())
  },
  Defaultcase(_defaultKeyword, _semi, statements) {
    return statements.tree()
  },
  Exp_binary(left, op, right) {
    return new ast.BinaryExp(left.tree(), op.sourceString, right.tree())
  },
  Joint_binary(left, op, right) {
    return new ast.BinaryExp(left.tree(), op.sourceString, right.tree())
  },
  AddOp_binary(left, op, right) {
    return new ast.BinaryExp(left.tree(), op.sourceString, right.tree())
  },
  Term_binary(left, op, right) {
    return new ast.BinaryExp(left.tree(), op.sourceString, right.tree())
  },
  Exponential_binary(left, op, right) {
    return new ast.BinaryExp(left.tree(), op.sourceString, right.tree())
  },
  Factor_negation(op, operand) {
    return new ast.UnaryExpression(op.sourceString, operand.tree(), true)
  },
  Factor_boolNegation(op, operand) {
    return new ast.UnaryExpression(op.sourceString, operand.tree(), true)
  },
  Factor_parens(_left, exp, _right) {
    return exp.tree()
  },
  Factor_arrayLit(_open, elements, _close) {
    return new ast.ArrayLit(elements.tree())
  },
  Factor_objLit(_open, pairs, _close) {
    return new ast.ObjLit(pairs.tree())
  },
  break(_) {
    return new ast.Break()
  },
  continue(_) {
    return new ast.Continue()
  },
  ReturnStatement(_return, returnValue) {
    if (returnValue.tree().length === 0) {
      return new ast.ShortReturnStatement()
    }

    return new ast.ReturnStatement(returnValue.tree()[0])
  },
  id(_first, _rest) {
    return new ast.IdentifierExpression(this.sourceString)
  },
  numlit_int(digits) {
    return BigInt(this.sourceString)
  },
  numlit_float(digits, dot, decimals) {
    return Number(this.sourceString)
  },
  stringlit(_left, chars, _right) {
    return chars.sourceString
  },
  boollit(bool) {
    if (bool.sourceString === "خطا") {
      return new ast.Bool(bool.sourceString, false)
    }
    return new ast.Bool(bool.sourceString, true)
  },
  Property_dotMemberExp(object, _dot, field) {
    return new ast.PropertyExpression(object.tree(), field.tree())
  },
  Property_memberExp(variable, _open, exp, _close) {
    return new ast.MemberExpression(variable.tree(), exp)
  },
  Arguments(exps) {
    return exps.asIteration().tree()
  },
  Parameters(values) {
    return values.asIteration().tree()
  },
  DictValues(pairs) {
    return pairs.asIteration().tree()
  },
  KeyValue(key, _sep, value) {
    return new ast.ObjPair(key.tree(), value.tree())
  },
  _terminal() {
    return this.sourceString
  },
})

export function syntaxIsOkay(sourceCode) {
  const match = lemonScriptGrammar.match(sourceCode)
  return match.succeeded()
}

export default function parse(sourceCode) {
  const match = lemonScriptGrammar.match(sourceCode)
  if (!match.succeeded()) {
    throw new Error(match.message)
  }
  return astBuilder(match).tree()
}


