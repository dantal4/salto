/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import { collections } from '@salto-io/lowerdash'
import {
  ObjectType,
  ElemID,
  BuiltinTypes,
  ListType,
  InstanceElement,
  ReferenceExpression,
  CORE_ANNOTATIONS,
} from '@salto-io/adapter-api'
import { mockFunction } from '@salto-io/test-utils'
import { getAllInstances } from '../../../src/elements_deprecated/swagger'
import { returnFullEntry } from '../../../src/elements_deprecated/field_finder'
import { HTTPError, Paginator } from '../../../src/client'
import { simpleGetArgs } from '../../../src/fetch/resource/request_parameters'
import { createElementQuery } from '../../../src/fetch/query/query'

const { toAsyncIterable } = collections.asynciterable

const ADAPTER_NAME = 'myAdapter'

describe('swagger_instance_elements', () => {
  describe('getAllInstances', () => {
    let mockPaginator: jest.MockedFunction<Paginator>

    const generateObjectTypes = (): Record<string, ObjectType> => {
      const Owner = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Owner'),
        fields: {
          name: { refType: BuiltinTypes.STRING },
        },
        annotations: {
          [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: {
            refType: new ReferenceExpression(BuiltinTypes.UNKNOWN.elemID, BuiltinTypes.UNKNOWN),
          },
        },
      })
      const Food = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Food'),
        fields: {
          id: { refType: BuiltinTypes.STRING },
          name: { refType: BuiltinTypes.STRING },
        },
      })
      const Pet = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Pet'),
        fields: {
          id: { refType: BuiltinTypes.STRING },
          name: { refType: BuiltinTypes.STRING },
          owners: { refType: new ListType(Owner) },
          primaryOwner: { refType: Owner },
        },
        annotations: {
          [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: {
            refType: new ReferenceExpression(Food.elemID, Food),
          },
        },
      })
      const Status = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Status'),
        fields: {
          id: { refType: BuiltinTypes.STRING },
          name: { refType: BuiltinTypes.STRING },
        },
      })
      const Fail = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Fail'),
        fields: {
          id: { refType: BuiltinTypes.STRING },
          name: { refType: BuiltinTypes.STRING },
        },
      })
      const Fail401 = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Fail401'),
        fields: {
          id: { refType: BuiltinTypes.STRING },
        },
      })
      const Singleton = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Singleton'),
        fields: {
          id: { refType: BuiltinTypes.STRING },
        },
      })

      return {
        Owner,
        Pet,
        Food,
        Status,
        Fail,
        Fail401,
        Singleton,
      }
    }

    beforeEach(() => {
      mockPaginator = mockFunction<Paginator>().mockImplementation(
        async function* getAll(getParams, extractPageEntries) {
          if (getParams.url === '/pet') {
            yield [
              {
                id: 'dog',
                name: 'def',
                owners: [{ name: 'o1', bla: 'BLA', x: { nested: 'value' } }],
                primaryOwner: { name: 'primary' },
                food1: { id: 'f1' },
                food2: { id: 'f2' },
              },
              {
                id: 'cat',
                name: 'def',
                owners: [{ name: 'o2', bla: 'BLA', x: { nested: 'value' } }],
                food1: { id: 'f1' },
                food2: { id: 'f2' },
              },
            ].flatMap(extractPageEntries)
            yield [
              {
                id: 'mouse',
                name: 'def',
                owners: [{ name: 'o3', bla: 'BLA', x: { nested: 'value' } }],
                food1: { id: 'f1' },
                food2: { id: 'f2' },
              },
            ].flatMap(extractPageEntries)
          }
          if (getParams.url === '/owner') {
            yield [{ name: 'owner2' }].flatMap(extractPageEntries)
          }
          if (getParams.url === '/status') {
            yield [{ id: '1', name: 'DoNe' }].flatMap(extractPageEntries)
          }
          if (getParams.url === '/fail') {
            throw new HTTPError('failed', { data: {}, status: 403 })
          }
          if (getParams.url === '/fail401') {
            throw new HTTPError('401', { data: {}, status: 401 })
          }
        },
      )
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return an error on 403 or 401', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Fail: {
              request: {
                url: '/fail',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Fail401: {
              request: {
                url: '/fail401',
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: '.*' }],
          exclude: [],
        }),
        supportedTypes: {
          Fail: ['Fail'],
          Fail401: ['Fail401'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.errors).toEqual([
        {
          severity: 'Warning',
          message: 'Other issues',
          detailedMessage:
            "Salto could not access the Fail resource. Elements from that type were not fetched. Please make sure that this type is enabled in your service, and that the supplied user credentials have sufficient permissions to access this data. You can also exclude this data from Salto's fetches by changing the environment configuration. Learn more at https://help.salto.io/en/articles/6947061-salto-could-not-access-the-resource",
        },
        {
          severity: 'Warning',
          message: 'Other issues',
          detailedMessage:
            "Salto could not access the Fail401 resource. Elements from that type were not fetched. Please make sure that this type is enabled in your service, and that the supplied user credentials have sufficient permissions to access this data. You can also exclude this data from Salto's fetches by changing the environment configuration. Learn more at https://help.salto.io/en/articles/6947061-salto-could-not-access-the-resource",
        },
      ])
    })
    it('should return instances corresponding to the HTTP response and the type', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }, { type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements).toHaveLength(4)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Owner.instance.owner2`,
        `${ADAPTER_NAME}.Pet.instance.dog`,
        `${ADAPTER_NAME}.Pet.instance.cat`,
        `${ADAPTER_NAME}.Pet.instance.mouse`,
      ])
      expect(mockPaginator).toHaveBeenCalledTimes(2)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/pet', queryParams: { a: 'b' }, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/owner', queryParams: undefined, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )

      const ownerInst = res.elements.find(e => e.elemID.name === 'owner2')
      expect(
        ownerInst?.isEqual(
          new InstanceElement(
            'owner2',
            objectTypes.Owner,
            {
              name: 'owner2',
            },
            [ADAPTER_NAME, 'Records', 'Owner', 'owner2'],
          ),
        ),
      ).toBeTruthy()
      const petInst = res.elements.find(e => e.elemID.name === 'dog')
      expect(
        petInst?.isEqual(
          new InstanceElement(
            'dog',
            objectTypes.Pet,
            {
              id: 'dog',
              name: 'def',
              owners: [
                {
                  name: 'o1',
                  bla: 'BLA',
                  x: { nested: 'value' },
                },
              ],
              primaryOwner: { name: 'primary' },
              food1: { id: 'f1' },
              food2: { id: 'f2' },
            },
            [ADAPTER_NAME, 'Records', 'Pet', 'dog'],
          ),
        ),
      ).toBeTruthy()
    })

    it('should use the request defaults', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            request: {
              paginationField: 'abc',
            },
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }, { type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements).toHaveLength(4)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Owner.instance.owner2`,
        `${ADAPTER_NAME}.Pet.instance.dog`,
        `${ADAPTER_NAME}.Pet.instance.cat`,
        `${ADAPTER_NAME}.Pet.instance.mouse`,
      ])
      expect(mockPaginator).toHaveBeenCalledTimes(2)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/pet', queryParams: { a: 'b' }, recursiveQueryParams: undefined, paginationField: 'abc' },
        expect.anything(),
      )
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/owner', queryParams: undefined, recursiveQueryParams: undefined, paginationField: 'abc' },
        expect.anything(),
      )
    })

    it('should not extract standalone fields', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
              nestStandaloneInstances: true,
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
              transformation: {
                standaloneFields: [{ fieldName: 'owners' }, { fieldName: 'primaryOwner' }],
                nestStandaloneInstances: false,
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }, { type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements).toHaveLength(8)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Owner.instance.owner2`,
        `${ADAPTER_NAME}.Pet.instance.dog`,
        `${ADAPTER_NAME}.Owner.instance.dog__o1`,
        `${ADAPTER_NAME}.Owner.instance.dog__primary`,
        `${ADAPTER_NAME}.Pet.instance.cat`,
        `${ADAPTER_NAME}.Owner.instance.cat__o2`,
        `${ADAPTER_NAME}.Pet.instance.mouse`,
        `${ADAPTER_NAME}.Owner.instance.mouse__o3`,
      ])
      expect(res.elements.map(e => e.path)).toEqual([
        [ADAPTER_NAME, 'Records', 'Owner', 'owner2'],
        [ADAPTER_NAME, 'Records', 'Pet', 'dog'],
        [ADAPTER_NAME, 'Records', 'Owner', 'dog__o1'],
        [ADAPTER_NAME, 'Records', 'Owner', 'dog__primary'],
        [ADAPTER_NAME, 'Records', 'Pet', 'cat'],
        [ADAPTER_NAME, 'Records', 'Owner', 'cat__o2'],
        [ADAPTER_NAME, 'Records', 'Pet', 'mouse'],
        [ADAPTER_NAME, 'Records', 'Owner', 'mouse__o3'],
      ])
    })
    it('should extract standalone fields', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
              nestStandaloneInstances: true,
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
              transformation: {
                standaloneFields: [{ fieldName: 'owners' }, { fieldName: 'primaryOwner' }],
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }, { type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements).toHaveLength(8)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Owner.instance.owner2`,
        `${ADAPTER_NAME}.Pet.instance.dog`,
        `${ADAPTER_NAME}.Owner.instance.dog__o1`,
        `${ADAPTER_NAME}.Owner.instance.dog__primary`,
        `${ADAPTER_NAME}.Pet.instance.cat`,
        `${ADAPTER_NAME}.Owner.instance.cat__o2`,
        `${ADAPTER_NAME}.Pet.instance.mouse`,
        `${ADAPTER_NAME}.Owner.instance.mouse__o3`,
      ])
      expect(res.elements.map(e => e.path)).toEqual([
        [ADAPTER_NAME, 'Records', 'Owner', 'owner2'],
        [ADAPTER_NAME, 'Records', 'Pet', 'dog', 'dog'],
        [ADAPTER_NAME, 'Records', 'Pet', 'dog', 'owners', 'dog__o1'],
        [ADAPTER_NAME, 'Records', 'Pet', 'dog', 'primaryOwner', 'dog__primary'],
        [ADAPTER_NAME, 'Records', 'Pet', 'cat', 'cat'],
        [ADAPTER_NAME, 'Records', 'Pet', 'cat', 'owners', 'cat__o2'],
        [ADAPTER_NAME, 'Records', 'Pet', 'mouse', 'mouse'],
        [ADAPTER_NAME, 'Records', 'Pet', 'mouse', 'owners', 'mouse__o3'],
      ])
      expect(mockPaginator).toHaveBeenCalledTimes(2)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/pet', queryParams: { a: 'b' }, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/owner', queryParams: undefined, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )

      const primaryOInst = res.elements.find(e => e.elemID.name === 'dog__primary') as InstanceElement
      const dogO1Inst = res.elements.find(e => e.elemID.name === 'dog__o1') as InstanceElement
      const petInst = res.elements.find(e => e.elemID.name === 'dog') as InstanceElement
      expect(primaryOInst).toBeInstanceOf(InstanceElement)
      expect(dogO1Inst).toBeInstanceOf(InstanceElement)
      expect(petInst).toBeInstanceOf(InstanceElement)
      expect(
        dogO1Inst.isEqual(
          new InstanceElement(
            'dog__o1',
            objectTypes.Owner,
            {
              name: 'o1',
              bla: 'BLA',
              x: { nested: 'value' },
            },
            // path has no effect on equality
            [],
            {
              _parent: [new ReferenceExpression(petInst.elemID)],
            },
          ),
        ),
      ).toBeTruthy()
      expect(
        primaryOInst.isEqual(
          new InstanceElement(
            'dog__primary',
            objectTypes.Owner,
            {
              name: 'primary',
            },
            // path has no effect on equality
            [],
            {
              _parent: [new ReferenceExpression(petInst.elemID)],
            },
          ),
        ),
      ).toBeTruthy()
      expect(
        petInst.isEqual(
          new InstanceElement(
            'dog',
            objectTypes.Pet,
            {
              id: 'dog',
              name: 'def',
              owners: [new ReferenceExpression(dogO1Inst.elemID)],
              primaryOwner: new ReferenceExpression(primaryOInst.elemID),
              food1: { id: 'f1' },
              food2: { id: 'f2' },
            },
            // path has no effect on equality
            [],
          ),
        ),
      ).toBeTruthy()
    })

    it('should not extract standalone fields that are not object types or lists of object types', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
              transformation: {
                standaloneFields: [{ fieldName: 'additionalProperties' }, { fieldName: 'name' }],
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }, { type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements).toHaveLength(4)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Owner.instance.owner2`,
        `${ADAPTER_NAME}.Pet.instance.dog`,
        `${ADAPTER_NAME}.Pet.instance.cat`,
        `${ADAPTER_NAME}.Pet.instance.mouse`,
      ])
    })

    it('should omit fieldsToOmit from instances', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
              transformation: {
                fieldsToOmit: [{ fieldName: 'name', fieldType: 'string' }, { fieldName: 'primaryOwner' }],
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }, { type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements).toHaveLength(4)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Owner.instance.owner2`,
        `${ADAPTER_NAME}.Pet.instance.dog`,
        `${ADAPTER_NAME}.Pet.instance.cat`,
        `${ADAPTER_NAME}.Pet.instance.mouse`,
      ])
      expect(mockPaginator).toHaveBeenCalledTimes(2)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/pet', queryParams: { a: 'b' }, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/owner', queryParams: undefined, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )

      const petInst = res.elements.find(e => e.elemID.name === 'dog') as InstanceElement
      expect(petInst).toBeInstanceOf(InstanceElement)
      // primaryOwner and name are omitted from the value
      expect(
        petInst.isEqual(
          new InstanceElement(
            'dog',
            objectTypes.Pet,
            {
              id: 'dog',
              owners: [
                {
                  name: 'o1',
                  bla: 'BLA',
                  x: { nested: 'value' },
                },
              ],
              food1: { id: 'f1' },
              food2: { id: 'f2' },
            },
            [ADAPTER_NAME, 'Records', 'Pet', 'dog'],
          ),
        ),
      ).toBeTruthy()
    })

    it("should return nested instances when nestedFieldFinder returns a specific field's details", async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
              },
            },
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }, { type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: async type => {
          if (type.fields.owners !== undefined) {
            return {
              field: type.fields.owners,
              type: objectTypes.Owner,
            }
          }
          return undefined
        },
      })
      expect(res.elements).toHaveLength(4)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Owner.instance.owner2`,
        `${ADAPTER_NAME}.Owner.instance.o1`,
        `${ADAPTER_NAME}.Owner.instance.o2`,
        `${ADAPTER_NAME}.Owner.instance.o3`,
      ])
      expect(mockPaginator).toHaveBeenCalledTimes(2)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/pet', queryParams: { a: 'b' }, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/owner', queryParams: undefined, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )

      const dogO1Inst = res.elements.find(e => e.elemID.name === 'o1') as InstanceElement
      expect(dogO1Inst).toBeInstanceOf(InstanceElement)
      expect(
        dogO1Inst.isEqual(
          new InstanceElement(
            'o1',
            objectTypes.Owner,
            {
              name: 'o1',
              bla: 'BLA',
              x: { nested: 'value' },
            },
            [ADAPTER_NAME, 'Records', 'Owner', 'o1'],
          ),
        ),
      ).toBeTruthy()
    })

    it('should fail gracefully if data field is not an object type', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Pet: {
              request: {
                url: '/pet',
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Pet: ['Pet'],
        },
        objectTypes,
        nestedFieldFinder: async type => ({
          field: type.fields.name,
          type, // not the real type
        }),
      })
      expect(res.elements).toHaveLength(0)
    })

    it('should extract inner instances for list types', async () => {
      const objectTypes = generateObjectTypes()
      const PetList = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'PetList'),
        fields: {
          items: { refType: new ListType(objectTypes.Pet) },
        },
      })

      mockPaginator = mockFunction<Paginator>().mockImplementationOnce(async function* get(_args, extractPageEntries) {
        yield [
          {
            id: 'dog',
            name: 'def',
            owners: [{ name: 'o1', bla: 'BLA', x: { nested: 'value' } }],
            primaryOwner: { name: 'primary' },
            food1: { id: 'f1' },
            food2: { id: 'f2' },
          },
          {
            id: 'cat',
            name: 'def',
            owners: [{ name: 'o2', bla: 'BLA', x: { nested: 'value' } }],
            food1: { id: 'f1' },
            food2: { id: 'f2' },
          },
        ].flatMap(extractPageEntries)
        yield [
          {
            id: 'mouse',
            name: 'def',
            owners: [{ name: 'o3', bla: 'BLA', x: { nested: 'value' } }],
            food1: { id: 'f1' },
            food2: { id: 'f2' },
          },
        ].flatMap(extractPageEntries)
        yield [
          {
            id: '33',
            name: 'def',
            owners: [{ name: 'o3', bla: 'BLA', x: { nested: 'value' } }],
            food1: { id: 'f1' },
            food2: { id: 'f2' },
          },
        ].flatMap(extractPageEntries)
      })
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            PetList: {
              request: {
                url: '/pet_list',
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Pet: ['PetList'],
        },
        objectTypes: {
          ...objectTypes,
          PetList,
        },
      })
      expect(res.elements).toHaveLength(4)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.Pet.instance.dog`,
        `${ADAPTER_NAME}.Pet.instance.cat`,
        `${ADAPTER_NAME}.Pet.instance.mouse`,
        `${ADAPTER_NAME}.Pet.instance.33@`, // digit-only ids should be escaped
      ])
      expect(mockPaginator).toHaveBeenCalledTimes(1)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/pet_list', queryParams: undefined, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )

      const petInst = res.elements.find(e => e.elemID.name === 'dog')
      expect(
        petInst?.isEqual(
          new InstanceElement(
            'dog',
            objectTypes.Pet,
            {
              id: 'dog',
              name: 'def',
              owners: [
                {
                  name: 'o1',
                  bla: 'BLA',
                  x: { nested: 'value' },
                },
              ],
              primaryOwner: { name: 'primary' },
              food1: { id: 'f1' },
              food2: { id: 'f2' },
            },
            [ADAPTER_NAME, 'Records', 'Pet', 'dog'],
          ),
        ),
      ).toBeTruthy()
    })

    it('(special case) should extract additionalProperties values if it is the only field nested under a dataField specified in configuration', async () => {
      const CustomObjectDefinition = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'CustomObjectDefinition'),
        fields: {
          name: { refType: BuiltinTypes.STRING },
        },
        annotations: {
          [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: {
            refType: new ReferenceExpression(BuiltinTypes.UNKNOWN.elemID, BuiltinTypes.UNKNOWN),
          },
        },
      })
      const CustomObjectDefinitionMapping = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'CustomObjectDefinitionMapping'),
        fields: {},
        annotations: {
          [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: {
            refType: new ReferenceExpression(CustomObjectDefinition.elemID, CustomObjectDefinition),
          },
        },
      })
      const AllCustomObjects = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'AllCustomObjects'),
        fields: {
          definitions: { refType: CustomObjectDefinitionMapping },
        },
      })
      const objectTypes = {
        CustomObjectDefinition,
        CustomObjectDefinitionMapping,
        AllCustomObjects,
      }

      mockPaginator = mockFunction<Paginator>().mockImplementationOnce(async function* get(_args, extractPageEntries) {
        yield [
          {
            definitions: {
              Pet: {
                name: 'Pet',
                something: 'else',
              },
              Owner: {
                name: 'Owner',
                custom: 'field',
              },
            },
          },
          {
            definitions: {
              Food: {
                name: 'Food',
              },
            },
          },
        ].flatMap(extractPageEntries)
      })
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['name'],
            },
          },
          types: {
            AllCustomObjects: {
              request: {
                url: '/custom_objects',
              },
              transformation: {
                dataField: 'definitions',
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'AllCustomObjects' }],
          exclude: [],
        }),
        supportedTypes: {
          AllCustomObjects: ['AllCustomObjects'],
        },
        objectTypes,
      })
      expect(res.elements).toHaveLength(3)
      expect(res.elements.map(e => e.elemID.getFullName())).toEqual([
        `${ADAPTER_NAME}.CustomObjectDefinition.instance.Pet`,
        `${ADAPTER_NAME}.CustomObjectDefinition.instance.Owner`,
        `${ADAPTER_NAME}.CustomObjectDefinition.instance.Food`,
      ])
      expect(mockPaginator).toHaveBeenCalledTimes(1)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/custom_objects', queryParams: undefined, recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )

      const petInst = res.elements.find(e => e.elemID.name === 'Pet') as InstanceElement
      expect(petInst).toBeInstanceOf(InstanceElement)
      expect(
        petInst.isEqual(
          new InstanceElement(
            'Pet',
            objectTypes.CustomObjectDefinition,
            {
              name: 'Pet',
              something: 'else',
            },
            [ADAPTER_NAME, 'CustomObjectDefinition', 'Owner', 'Pet'],
          ),
        ),
      ).toBeTruthy()
    })

    it('should not put existing field values under additionalProperties even if they unexpectedly contain lists', async () => {
      const objectTypes = generateObjectTypes()

      mockPaginator = mockFunction<Paginator>().mockImplementation(
        async function* getAll(getParams, extractPageEntries) {
          if (getParams.url === '/pet') {
            yield [
              {
                id: 'mouse',
                name: 'def',
                primaryOwner: [{ name: 'o3', bla: 'BLA', x: { nested: 'value' } }],
              },
            ].flatMap(extractPageEntries)
          }
        },
      )
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Pet: {
              request: {
                url: '/pet',
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements).toHaveLength(1)
      const petInst = res.elements[0]
      expect(petInst.elemID.getFullName()).toEqual(`${ADAPTER_NAME}.Pet.instance.mouse`)
      expect(mockPaginator).toHaveBeenCalledTimes(1)
      expect(mockPaginator).toHaveBeenCalledWith(
        { url: '/pet', recursiveQueryParams: undefined, paginationField: undefined },
        expect.anything(),
      )

      expect(
        petInst.isEqual(
          new InstanceElement(
            'mouse',
            objectTypes.Pet,
            {
              id: 'mouse',
              name: 'def',
              primaryOwner: [
                {
                  name: 'o3',
                  bla: 'BLA',
                  x: { nested: 'value' },
                },
              ],
            },
            [ADAPTER_NAME, 'Records', 'Pet', 'mouse'],
          ),
        ),
      ).toBeTruthy()
    })

    describe('with types that require recursing', () => {
      let instances: InstanceElement[]
      let getAllInstancesParams: Parameters<typeof getAllInstances>[0]
      beforeEach(async () => {
        mockPaginator.mockImplementation(({ url }) => {
          if (url === '/pet') {
            return toAsyncIterable([
              [
                { id: 'dog', name: 'def' },
                { id: 'cat', name: 'def' },
                { id: 'fish', name: 'fish' },
              ],
            ])
          }
          if (url === '/pet/dog/owner' || url === '/pet/fish/owner') {
            return toAsyncIterable([[{ name: 'o1' }, { name: 'o2' }]])
          }
          if (url === '/pet/dog/owner/o1/nicknames') {
            return toAsyncIterable([[{ names: ['n1', 'n2'] }]])
          }
          if (url === '/pet/dog/owner/o2/nicknames') {
            return toAsyncIterable([[{ names: ['n3'] }]])
          }
          if (url.match(/\/pet\/.*\/owner\/.*\/info/) !== null) {
            return toAsyncIterable([[{ numOfPets: 2 }]])
          }
          return toAsyncIterable([[]])
        })

        const objectTypes = generateObjectTypes()

        getAllInstancesParams = {
          paginator: mockPaginator,
          apiConfig: {
            typeDefaults: {
              transformation: {
                idFields: ['id'],
              },
            },
            types: {
              Pet: {
                request: {
                  url: '/pet',
                  recurseInto: [
                    {
                      type: 'Owner',
                      toField: 'owners',
                      context: [
                        { name: 'petId', fromField: 'id' },
                        { name: 'petName', fromField: 'name' },
                      ],
                      conditions: [{ fromField: 'id', match: ['dog', 'fish'] }],
                    },
                  ],
                },
              },
              Owner: {
                request: {
                  url: '/pet/{petId}/owner',
                  recurseInto: [
                    {
                      type: 'OwnerNickNames',
                      toField: 'nicknames',
                      context: [{ name: 'ownerName', fromField: 'name' }],
                      conditions: [{ fromContext: 'petName', match: ['def'] }],
                    },
                    {
                      type: 'OwnerInfo',
                      toField: 'info',
                      context: [{ name: 'ownerName', fromField: 'name' }],
                      isSingle: true,
                    },
                  ],
                },
              },
              OwnerNickNames: {
                request: {
                  url: '/pet/{petId}/owner/{ownerName}/nicknames',
                },
                transformation: { dataField: 'items' },
              },
              OwnerInfo: {
                request: {
                  url: '/pet/{petId}/owner/{ownerName}/info',
                },
              },
            },
          },
          fetchQuery: createElementQuery({
            include: [{ type: 'Pet' }],
            exclude: [],
          }),
          supportedTypes: {
            Pet: ['Pet'],
          },
          objectTypes: {
            ...objectTypes,
            OwnerNickNames: new ObjectType({
              elemID: new ElemID(ADAPTER_NAME, 'OwnerNickNames'),
              fields: {
                names: {
                  refType: new ListType(BuiltinTypes.STRING),
                },
              },
            }),
            OwnerInfo: new ObjectType({
              elemID: new ElemID(ADAPTER_NAME, 'OwnerInfo'),
              fields: { numOfPets: { refType: BuiltinTypes.NUMBER } },
            }),
          },
        }

        instances = (await getAllInstances(getAllInstancesParams)).elements
      })
      it('should get inner types recursively for instances that match the condition', () => {
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/dog/owner' }),
          expect.anything(),
        )
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/fish/owner' }),
          expect.anything(),
        )
        expect(mockPaginator).not.toHaveBeenCalledWith(
          expect.objectContaining({ url: expect.stringContaining('/pet/cat/') }),
          expect.anything(),
        )
      })
      it('should get inner types for instances based on context from previous requests', () => {
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/dog/owner/o1/nicknames' }),
          expect.anything(),
        )
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/dog/owner/o2/nicknames' }),
          expect.anything(),
        )
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/dog/owner/o1/info' }),
          expect.anything(),
        )
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/dog/owner/o2/info' }),
          expect.anything(),
        )
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/fish/owner/o1/info' }),
          expect.anything(),
        )
        expect(mockPaginator).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/pet/fish/owner/o2/info' }),
          expect.anything(),
        )

        expect(mockPaginator).not.toHaveBeenCalledWith(
          expect.objectContaining({ url: expect.stringMatching(/\/pet\/fish\/owner\/.*\/nicknames/) }),
        )
      })
      it('should return nested value list in the instance when isSingle is falsy and single item when isSingle=true', () => {
        expect(instances).toHaveLength(3)
        const [dog, cat, fish] = instances
        expect(dog.value).toHaveProperty('owners', [
          {
            name: 'o1',
            nicknames: [{ names: ['n1', 'n2'] }],
            info: { numOfPets: 2 },
          },
          {
            name: 'o2',
            nicknames: [{ names: ['n3'] }],
            info: { numOfPets: 2 },
          },
        ])
        expect(cat.value).not.toHaveProperty('owners')
        expect(fish.value).toHaveProperty('owners', [
          { name: 'o1', info: { numOfPets: 2 } },
          { name: 'o2', info: { numOfPets: 2 } },
        ])
      })

      it('should not return instances if failed to get their inner values', async () => {
        mockPaginator.mockImplementation(({ url }) => {
          if (url === '/pet') {
            return toAsyncIterable([
              [
                { id: 'dog', name: 'def' },
                { id: 'cat', name: 'def' },
                { id: 'fish', name: 'fish' },
              ],
            ])
          }
          if (url === '/pet/fish/owner') {
            throw new Error('some error')
          }
          if (url === '/pet/dog/owner') {
            return toAsyncIterable([[{ name: 'o1' }, { name: 'o2' }]])
          }
          if (url === '/pet/dog/owner/o1/nicknames') {
            return toAsyncIterable([[{ names: ['n1', 'n2'] }]])
          }
          if (url === '/pet/dog/owner/o2/nicknames') {
            return toAsyncIterable([[{ names: ['n3'] }]])
          }
          if (url.match(/\/pet\/.*\/owner\/.*\/info/) !== null) {
            return toAsyncIterable([[{ numOfPets: 2 }]])
          }
          return toAsyncIterable([[]])
        })

        instances = (await getAllInstances(getAllInstancesParams)).elements

        expect(instances).toHaveLength(2)
        const [dog, cat] = instances
        expect(dog.value).toHaveProperty('owners', [
          {
            name: 'o1',
            nicknames: [{ names: ['n1', 'n2'] }],
            info: { numOfPets: 2 },
          },
          {
            name: 'o2',
            nicknames: [{ names: ['n3'] }],
            info: { numOfPets: 2 },
          },
        ])
        expect(cat.value).not.toHaveProperty('owners')
      })

      it('should return instances if failed to get their inner values and skipOnError is true', async () => {
        if (getAllInstancesParams.apiConfig.types.Pet.request?.recurseInto?.[0] !== undefined) {
          getAllInstancesParams.apiConfig.types.Pet.request.recurseInto[0].skipOnError = true
        }

        mockPaginator.mockImplementation(({ url }) => {
          if (url === '/pet') {
            return toAsyncIterable([
              [
                { id: 'dog', name: 'def' },
                { id: 'cat', name: 'def' },
                { id: 'fish', name: 'fish' },
              ],
            ])
          }
          if (url === '/pet/fish/owner') {
            throw new Error('some error')
          }
          if (url === '/pet/dog/owner') {
            return toAsyncIterable([[{ name: 'o1' }, { name: 'o2' }]])
          }
          if (url === '/pet/dog/owner/o1/nicknames') {
            return toAsyncIterable([[{ names: ['n1', 'n2'] }]])
          }
          if (url === '/pet/dog/owner/o2/nicknames') {
            return toAsyncIterable([[{ names: ['n3'] }]])
          }
          if (url.match(/\/pet\/.*\/owner\/.*\/info/) !== null) {
            return toAsyncIterable([[{ numOfPets: 2 }]])
          }
          return toAsyncIterable([[]])
        })

        instances = (await getAllInstances(getAllInstancesParams)).elements

        expect(instances).toHaveLength(3)
        const [dog, cat, fish] = instances
        expect(dog.value).toHaveProperty('owners', [
          {
            name: 'o1',
            nicknames: [{ names: ['n1', 'n2'] }],
            info: { numOfPets: 2 },
          },
          {
            name: 'o2',
            nicknames: [{ names: ['n3'] }],
            info: { numOfPets: 2 },
          },
        ])
        expect(cat.value).not.toHaveProperty('owners')
        expect(fish.value).not.toHaveProperty('owners')
      })
    })

    it('should fail if type is missing from config', async () => {
      const objectTypes = generateObjectTypes()
      await expect(() =>
        getAllInstances({
          paginator: mockPaginator,
          apiConfig: {
            typeDefaults: {
              transformation: {
                idFields: ['id'],
              },
            },
            types: {
              Pet: {},
            },
          },
          fetchQuery: createElementQuery({
            include: [{ type: 'Owner' }],
            exclude: [],
          }),
          supportedTypes: {
            Owner: ['Owner'],
          },
          objectTypes,
        }),
      ).rejects.toThrow(new Error('could not find type Owner'))
    })
    it('should fail if type is missing from object types', async () => {
      const objectTypes = generateObjectTypes()
      await expect(() =>
        getAllInstances({
          paginator: mockPaginator,
          apiConfig: {
            typeDefaults: {
              transformation: {
                idFields: ['id'],
              },
            },
            types: {
              Bla: {},
            },
          },
          fetchQuery: createElementQuery({
            include: [{ type: 'Bla' }],
            exclude: [],
          }),
          supportedTypes: {
            Bla: ['Bla'],
          },
          objectTypes,
        }),
      ).rejects.toThrow(new Error('could not find type Bla'))
    })
    it('should fail if type does not have request details', async () => {
      const objectTypes = generateObjectTypes()
      await expect(() =>
        getAllInstances({
          paginator: mockPaginator,
          apiConfig: {
            typeDefaults: {
              transformation: {
                idFields: ['id'],
              },
            },
            types: {
              Pet: {},
            },
          },
          fetchQuery: createElementQuery({
            include: [{ type: 'Pet' }],
            exclude: [],
          }),
          supportedTypes: {
            Pet: ['Pet'],
          },
          objectTypes,
        }),
      ).rejects.toThrow(new Error('Invalid type config - type myAdapter.Pet has no request config'))
    })

    it('should convert name and filename if nameMapping exists', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Status: {
              request: {
                url: '/status',
              },
              transformation: {
                idFields: ['name'],
                nameMapping: 'lowercase',
              },
            },
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
                nameMapping: 'uppercase',
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Status' }, { type: 'Owner' }],
          exclude: [],
        }),
        supportedTypes: {
          Status: ['Status'],
          Owner: ['Owner'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements.map(e => e.elemID.name)).toEqual(['done', 'OWNER2'])
      expect(res.elements.map(e => e.path)).toEqual([
        [ADAPTER_NAME, 'Records', 'Status', 'done'],
        [ADAPTER_NAME, 'Records', 'Owner', 'OWNER2'],
      ])
    })
  })

  describe('test singleton types', () => {
    let mockPaginator: jest.MockedFunction<Paginator>

    const generateObjectTypes = (): Record<string, ObjectType> => {
      const Owner = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Owner'),
        fields: {
          name: { refType: BuiltinTypes.STRING },
        },
        annotations: {
          [CORE_ANNOTATIONS.ADDITIONAL_PROPERTIES]: {
            refType: new ReferenceExpression(BuiltinTypes.UNKNOWN.elemID, BuiltinTypes.UNKNOWN),
          },
        },
        isSettings: true,
      })
      const Pet = new ObjectType({
        elemID: new ElemID(ADAPTER_NAME, 'Pet'),
        fields: {
          id: { refType: BuiltinTypes.STRING },
          name: { refType: BuiltinTypes.STRING },
        },
        isSettings: true,
      })
      return {
        Owner,
        Pet,
      }
    }

    beforeEach(() => {
      mockPaginator = mockFunction<Paginator>().mockImplementation(
        async function* getAll(getParams, extractPageEntries) {
          if (getParams.url === '/pet') {
            yield [
              {
                id: 'dog',
                name: 'def',
              },
              {
                id: 'cat',
                name: 'def',
              },
            ].flatMap(extractPageEntries)
          }
          if (getParams.url === '/owner') {
            yield [{ name: 'owner2' }].flatMap(extractPageEntries)
          }
        },
      )
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should have the correct instance name as a singleton types', async () => {
      const objectTypes = generateObjectTypes()
      const res = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Owner: {
              request: {
                url: '/owner',
              },
              transformation: {
                idFields: ['name'],
                isSingleton: true,
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Owner' }],
          exclude: [],
        }),
        supportedTypes: {
          Owner: ['Owner'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(res.elements.map(e => e.elemID.name)).toEqual([`${ElemID.CONFIG_NAME}`])
      expect(res.elements.map(e => e.path)).toEqual([[ADAPTER_NAME, 'Records', 'Settings', 'Owner']])
    })
    it('should return fetch error if singleton type have more than one instance', async () => {
      const objectTypes = generateObjectTypes()
      const result = await getAllInstances({
        paginator: mockPaginator,
        apiConfig: {
          typeDefaults: {
            transformation: {
              idFields: ['id'],
            },
          },
          types: {
            Pet: {
              request: {
                url: '/pet',
                queryParams: {
                  a: 'b',
                },
              },
              transformation: {
                isSingleton: true,
              },
            },
          },
        },
        fetchQuery: createElementQuery({
          include: [{ type: 'Pet' }],
          exclude: [],
        }),
        supportedTypes: {
          Pet: ['Pet'],
        },
        objectTypes,
        computeGetArgs: simpleGetArgs,
        nestedFieldFinder: returnFullEntry,
      })
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0]).toEqual({
        message: 'Other issues',
        detailedMessage: 'Could not fetch type Pet, singleton types should not have more than one instance',
        severity: 'Warning',
      })
    })
  })
})
