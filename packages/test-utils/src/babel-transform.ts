import generate from '@babel/generator'
import { parse } from '@babel/parser'
import traverse, { type Visitor } from '@babel/traverse'

type VisitorFactory = () => Visitor

export function createTransform(factories: VisitorFactory[]) {
  return (input: string) => {
    const ast = parse(input, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
    })
    for (const factory of factories) {
      traverse(ast, factory())
    }
    return generate(ast).code
  }
}
