/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { PrimitiveType, ElemID, PrimitiveTypes } from '@salto-io/adapter-api'
import _ from 'lodash'
import { MergeResult, MergeError, mergeNoDuplicates } from './common'
import { DuplicateAnnotationTypeError } from './object_types'

export class MultiplePrimitiveTypesError extends MergeError {
  readonly duplicates: PrimitiveType[]
  constructor({ elemID, duplicates }: { elemID: ElemID; duplicates: PrimitiveType[] }) {
    super({
      elemID,
      error: [
        'Merging for primitive types with different primitives is not supported',
        `Found duplicated element ${duplicates[0].elemID.getFullName()}`,
      ].join('. '),
    })
    this.duplicates = duplicates
  }
}

const mergePrimitiveDefinitions = (
  { elemID, primitive }: { elemID: ElemID; primitive: PrimitiveTypes },
  primitives: PrimitiveType[],
): MergeResult<PrimitiveType> => {
  const annotationsMergeResults = mergeNoDuplicates(
    primitives.map(prim => prim.annotations),
    key => new DuplicateAnnotationTypeError({ elemID, key }),
  )

  const annotationTypesMergeResults = mergeNoDuplicates(
    primitives.map(prim => prim.annotationRefTypes),
    key => new DuplicateAnnotationTypeError({ elemID, key }),
  )

  const primitiveType = primitives[0].primitive
  const primitiveTypeErrors = _.every(
    primitives.map(prim => prim.primitive),
    prim => prim === primitiveType,
  )
    ? []
    : [
        new MultiplePrimitiveTypesError({
          elemID: primitives[0].elemID,
          duplicates: primitives,
        }),
      ]

  return {
    merged: new PrimitiveType({
      elemID,
      primitive,
      annotationRefsOrTypes: annotationTypesMergeResults.merged,
      annotations: annotationsMergeResults.merged,
    }),
    errors: [...annotationsMergeResults.errors, ...annotationTypesMergeResults.errors, ...primitiveTypeErrors],
  }
}

export const mergePrimitives = (primitives: PrimitiveType[]): MergeResult<PrimitiveType> =>
  mergePrimitiveDefinitions(primitives[0], primitives)
