'use strict'

const tap = require('tap')
const { operations } = require('@ldapjs/protocol')
const filter = require('@ldapjs/filter')
const SearchRequest = require('./search-request')
const { DN } = require('@ldapjs/dn')
const { BerReader, BerWriter } = require('@ldapjs/asn1')

const {
  searchRequestBytes
} = require('./_fixtures/message-byte-arrays')

tap.test('basic', t => {
  t.test('constructor no args', async t => {
    const req = new SearchRequest()
    const pojo = req.pojo
    t.strictSame(pojo, {
      messageId: 1,
      protocolOp: operations.LDAP_REQ_SEARCH,
      type: 'SearchRequest',
      baseObject: '',
      scope: 'base',
      derefAliases: SearchRequest.DEREF_ALIASES_NEVER,
      sizeLimit: 0,
      timeLimit: 0,
      typesOnly: false,
      filter: '(objectclass=*)',
      attributes: [],
      controls: []
    })

    t.equal(req.type, 'SearchRequest')
  })

  t.test('constructor with args', async t => {
    const req = new SearchRequest({
      baseObject: 'cn=foo,dc=example,dc=com',
      scope: SearchRequest.SCOPE_SUBTREE,
      derefAliases: SearchRequest.DEREF_BASE_OBJECT,
      sizeLimit: 1,
      timeLimit: 1,
      typesOnly: true,
      filter: new filter.EqualityFilter({ attribute: 'cn', value: 'foo' }),
      attributes: ['*']
    })
    const pojo = req.pojo
    t.strictSame(pojo, {
      messageId: 1,
      protocolOp: operations.LDAP_REQ_SEARCH,
      type: 'SearchRequest',
      baseObject: 'cn=foo,dc=example,dc=com',
      scope: 'subtree',
      derefAliases: SearchRequest.DEREF_BASE_OBJECT,
      sizeLimit: 1,
      timeLimit: 1,
      typesOnly: true,
      filter: '(cn=foo)',
      attributes: ['*'],
      controls: []
    })
  })

  t.end()
})

tap.test('.attributes', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.strictSame(req.attributes, [])

    req.attributes = ['*']
    t.strictSame(req.attributes, ['*'])
  })

  t.test('set overwrites current list', async t => {
    const req = new SearchRequest({
      attributes: ['1.1']
    })
    req.attributes = ['1.1', '*', '@foo3-bar.2']

    t.strictSame(req.attributes, ['1.1', '*', '@foo3-bar.2'])
  })

  t.test('throws if not an array', async t => {
    t.throws(
      () => new SearchRequest({ attributes: '*' }),
      'attributes must be an array of attribute strings'
    )
  })

  t.test('throws if array contains non-attribute', async t => {
    const input = [
      '*',
      'not allowed'
    ]
    t.throws(
      () => new SearchRequest({ attributes: input }),
      'attribute must be a valid string'
    )
  })

  t.end()
})

tap.test('.baseObject', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.equal(req.baseObject.toString(), '')

    req.baseObject = 'dc=example,dc=com'
    t.equal(req.baseObject.toString(), 'dc=example,dc=com')

    req.baseObject = DN.fromString('dc=example,dc=net')
    t.equal(req.baseObject.toString(), 'dc=example,dc=net')
    t.equal(req._dn.toString(), 'dc=example,dc=net')
  })

  t.test('throws for non-DN object', async t => {
    const req = new SearchRequest()
    t.throws(
      () => {
        req.baseObject = ['foo']
      },
      'baseObject must be a DN string or DN instance'
    )
  })

  t.end()
})

tap.test('.derefAliases', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.equal(req.derefAliases, SearchRequest.DEREF_ALIASES_NEVER)

    req.derefAliases = SearchRequest.DEREF_ALWAYS
    t.equal(req.derefAliases, SearchRequest.DEREF_ALWAYS)
  })

  t.test('throws for bad value', async t => {
    const req = new SearchRequest()
    t.throws(
      () => {
        req.derefAliases = '0'
      },
      'derefAliases must be set to an integer'
    )
  })

  t.end()
})

tap.test('.filter', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.equal(req.filter.toString(), '(objectclass=*)')

    req.filter = '(cn=foo)'
    t.equal(req.filter.toString(), '(cn=foo)')

    req.filter = new filter.EqualityFilter({ attribute: 'sn', value: 'bar' })
    t.equal(req.filter.toString(), '(sn=bar)')
  })

  t.test('throws for bad value', async t => {
    const expected = 'filter must be a string or a FilterString instance'
    const req = new SearchRequest()
    t.throws(
      () => {
        req.filter = ['foo']
      },
      expected
    )
    t.throws(
      () => {
        req.filter = { attribute: 'cn', value: 'foo' }
      },
      expected
    )
  })

  t.end()
})

tap.test('.scope', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.equal(req.scope, 'base')

    req.scope = SearchRequest.SCOPE_SINGLE
    t.equal(req.scope, 'single')

    req.scope = SearchRequest.SCOPE_SUBTREE
    t.equal(req.scope, 'subtree')

    req.scope = 'SUB'
    t.equal(req.scope, 'subtree')

    req.scope = 'base'
    t.equal(req.scope, 'base')
  })

  t.test('throws for invalid value', async t => {
    const expected = ' is an invalid search scope'
    const req = new SearchRequest()

    t.throws(
      () => {
        req.scope = 'nested'
      },
      'nested' + expected
    )

    t.throws(
      () => {
        req.scope = 42
      },
      42 + expected
    )
  })

  t.end()
})

tap.test('.sizeLimit', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.equal(req.sizeLimit, 0)

    req.sizeLimit = 15
    t.equal(req.sizeLimit, 15)
  })

  t.test('throws for bad value', async t => {
    const req = new SearchRequest()
    t.throws(
      () => {
        req.sizeLimit = 15.5
      },
      'sizeLimit must be an integer'
    )
  })

  t.end()
})

tap.test('.timeLimit', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.equal(req.timeLimit, 0)

    req.timeLimit = 15
    t.equal(req.timeLimit, 15)
  })

  t.test('throws for bad value', async t => {
    const req = new SearchRequest()
    t.throws(
      () => {
        req.timeLimit = 15.5
      },
      'timeLimit must be an integer'
    )
  })

  t.end()
})

tap.test('.typesOnly', t => {
  t.test('sets/gets', async t => {
    const req = new SearchRequest()
    t.equal(req.typesOnly, false)

    req.typesOnly = true
    t.equal(req.typesOnly, true)
  })

  t.test('throws for bad value', async t => {
    const req = new SearchRequest()
    t.throws(
      () => {
        req.typesOnly = 'true'
      },
      'typesOnly must be set to a boolean value'
    )
  })

  t.end()
})

tap.test('_toBer', t => {
  tap.test('converts instance to BER', async t => {
    const req = new SearchRequest({
      messageId: 2,
      baseObject: 'dc=example,dc=com',
      scope: 'subtree',
      derefAliases: SearchRequest.DEREF_ALIASES_NEVER,
      sizeLimit: 1000,
      timeLimit: 30,
      typesOnly: false,
      filter: '(&(objectClass=person)(uid=jdoe))',

      attributes: ['*', '+']
    })
    const writer = new BerWriter()
    req._toBer(writer)

    t.equal(
      Buffer.from(searchRequestBytes.slice(5)).compare(writer.buffer),
      0
    )
  })

  t.end()
})

tap.test('_pojo', t => {
  t.test('returns a pojo representation', async t => {
    const req = new SearchRequest()
    t.strictSame(req._pojo(), {
      baseObject: '',
      scope: 'base',
      derefAliases: 0,
      sizeLimit: 0,
      timeLimit: 0,
      typesOnly: false,
      filter: '(objectclass=*)',
      attributes: []
    })
  })

  t.end()
})

tap.test('#parseToPojo', t => {
  t.test('throws if operation incorrect', async t => {
    const reqBuffer = Buffer.from(searchRequestBytes)
    reqBuffer[5] = 0x61

    const reader = new BerReader(reqBuffer)
    reader.readSequence()
    reader.readInt()

    t.throws(
      () => SearchRequest.parseToPojo(reader),
      Error('found wrong protocol operation: 0x61')
    )
  })

  t.test('returns a pojo representation', async t => {
    const reqBuffer = Buffer.from(searchRequestBytes)
    const reader = new BerReader(reqBuffer)
    reader.readSequence()
    reader.readInt()

    const pojo = SearchRequest.parseToPojo(reader)
    t.equal(pojo.protocolOp, operations.LDAP_REQ_SEARCH)
    t.equal(pojo.baseObject, 'dc=example,dc=com')
    t.equal(pojo.scope, SearchRequest.SCOPE_SUBTREE)
    t.equal(pojo.derefAliases, SearchRequest.DEREF_ALIASES_NEVER)
    t.equal(pojo.sizeLimit, 1000)
    t.equal(pojo.timeLimit, 30)
    t.equal(pojo.typesOnly, false)
    t.equal(pojo.filter, '(&(objectClass=person)(uid=jdoe))')
    t.strictSame(pojo.attributes, ['*', '+'])
  })

  t.end()
})