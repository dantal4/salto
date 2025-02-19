/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import { makeArray, arrayOf, findDuplicates, splitDuplicates } from '../../src/collections/array'

describe('array', () => {
  describe('makeArray', () => {
    describe('when passed undefined', () => {
      it('returns an empty array', () => {
        expect(makeArray(undefined)).toEqual([])
      })
    })

    describe('when passed a non-array arg', () => {
      it('returns an array wrapping the arg', () => {
        expect(makeArray(12)).toEqual([12])
        const s = new Set<number>([13])
        expect(makeArray(s)).toEqual([s])
      })
    })

    describe('when passed an array', () => {
      it('returns the array', () => {
        const ar = [12, 13]
        expect(makeArray(ar)).toBe(ar)
      })
    })
  })

  describe('arrayOf', () => {
    const ARRAY_LENGTH = 5

    describe('when an initializer is specified', () => {
      let result: string[]
      beforeEach(() => {
        result = arrayOf(ARRAY_LENGTH, i => i.toString())
      })

      it('returns an array', () => {
        expect(_.isArray(result)).toBeTruthy()
      })

      it('returns an array of the specified length', () => {
        expect(result).toHaveLength(5)
      })

      it('returns an array with the correct items', () => {
        expect(result).toEqual(['0', '1', '2', '3', '4'])
      })
    })

    describe('when an initializer is not specified', () => {
      let result: undefined[]
      beforeEach(() => {
        result = arrayOf(ARRAY_LENGTH)
      })

      it('returns an array', () => {
        expect(_.isArray(result)).toBeTruthy()
      })

      it('returns an array of the specified length', () => {
        expect(result).toHaveLength(5)
      })

      it('returns an array whose all items are undefined', () => {
        expect(result).toEqual([undefined, undefined, undefined, undefined, undefined])
      })
    })
  })
  describe('findDuplicates', () => {
    it('should return empty array when no duplicates are found', () => {
      expect(findDuplicates([])).toEqual([])
      expect(findDuplicates(['abc', 'def', 'abd', 'aaabbb'])).toEqual([])
    })

    it('should return sorted array with each duplicate appearing once when duplicates are found', () => {
      expect(findDuplicates(['def', 'abc', 'def', 'abd', 'aaa', 'def', 'abc'])).toEqual(['abc', 'def'])
    })
  })

  describe('splitDuplicates', () => {
    describe('with input array that contains some duplicates', () => {
      let res: ReturnType<typeof splitDuplicates>
      beforeEach(() => {
        res = splitDuplicates(['a', 'b', 'cc', 'ddd'], item => item.length)
      })
      it('should return unique values as unique', () => {
        expect(res.uniques).toEqual(['cc', 'ddd'])
      })
      it('should place duplicate values in groups according to the key function', () => {
        expect(res.duplicates).toEqual([['a', 'b']])
      })
    })
  })
})
