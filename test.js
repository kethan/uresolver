import assert from "assert";
import { resolve, virtual } from "./src/index.js";
function test(message, callback) {
  try {
    callback();
    console.log(`✅ PASS: ${message}`);
  } catch (error) {
    console.error(`❌ FAIL: ${message}`);
    console.error(error);
  }
}

test('example: drop email, add extra, prefix phone, resolve address with ctx', async () => {
  const r = resolve({
    name: (value) => value.toUpperCase(),
    age: (value) => value * 2,
    address: async (value, _, ctx) => ({
      street: value.street.toUpperCase(),
      city: value.city.toUpperCase(),
      state: value.state.toUpperCase(),
      country: ctx.getCountry(),
    }),
    phone: (value) => '+91 ' + value.toString(),
    extra: () => 90,
    email: () => undefined,
  });

  const input = {
    name: 'John Doe',
    age: 20,
    address: {
      street: 'Main Street',
      number: 123,
      city: 'New York',
      state: 'New York',
      country: 'United States',
    },
    phone: '0123456789',
    email: 'a@a.com',
  };

  const out = await r.resolve(input, { getCountry: () => 'India' });
  assert.deepStrictEqual(out, {
    name: 'JOHN DOE',
    age: 40,
    address: {
      street: 'MAIN STREET',
      city: 'NEW YORK',
      state: 'NEW YORK',
      country: 'India',
    },
    phone: '+91 0123456789',
    extra: 90,
  });
});

const resolvers = {
  name: async () => "John",
  age: () => Promise.resolve(25),
  address: async () =>
    Promise.resolve({
      street: "123 Main St",
      city: "Example City",
      state: "CA",
      zip: "12345",
    }),
};

// Test resolve function
const resolver = resolve(resolvers);

// Test case 1
test("should resolve an object with resolvers", async () => {
  const result1 = await resolver.resolve(
    { name: "Guest", age: 30, address: null },
    {}
  );
  assert.deepStrictEqual(result1, {
    name: "John",
    age: 25,
    address: {
      street: "123 Main St",
      city: "Example City",
      state: "CA",
      zip: "12345",
    },
  });
});

// Test case 2
test('should resolve an array of objects with resolvers', async () => {
  const result2 = await resolver.resolve([
    { name: 'Guest', age: 30, address: null },
    { name: 'User', age: 40, address: null },
  ], {});
  assert.deepStrictEqual(result2, [
    {
      name: 'John',
      age: 25,
      address: {
        street: '123 Main St',
        city: 'Example City',
        state: 'CA',
        zip: '12345',
      },
    },
    {
      name: 'John',
      age: 25,
      address: {
        street: '123 Main St',
        city: 'Example City',
        state: 'CA',
        zip: '12345',
      },
    },
  ]);
});

// Test case 3
test('should apply the converter if provided', async () => {
  const converter = (item) => Promise.resolve({
    ...item,
    convertedName: item.name.toUpperCase(),
    convertedAge: item.age * 2,
  });
  const resolverWithConverter = resolve(resolvers, { converter });
  const result3 = await resolverWithConverter.resolve({ name: 'Guest', age: 30, address: null }, {});

  assert.deepStrictEqual(result3, {
    name: 'John',
    age: 25,
    address: {
      street: '123 Main St',
      city: 'Example City',
      state: 'CA',
      zip: '12345'
    },
    convertedName: 'GUEST',
    convertedAge: 60,
  });
});

test('simple resolver', async () => {

  const context = {
    isContext: true
  }

  const userResolver = resolve({
    password: async () => undefined,

    name: async (_value, user, ctx) => {
      assert.deepStrictEqual(ctx, context)
      return `${user.firstName} ${user.lastName}`
    }
  })

  const u = await userResolver.resolve(
    {
      firstName: 'Dave',
      lastName: 'L.'
    },
    context
  )

  assert.deepStrictEqual(u, {
    firstName: 'Dave',
    lastName: 'L.',
    name: 'Dave L.'
  })
})

test('simple resolver with virtual properties', async () => {
  const userResolver = resolve({
    password: async () => undefined,
    name: (async (_, user, ctx) => {
      return `${user.firstName} ${user.lastName}`
    })
  })

  const u = await userResolver.resolve(
    {
      firstName: 'Dave',
      lastName: 'L.'
    }
  )

  assert.deepStrictEqual(u, {
    firstName: 'Dave',
    lastName: 'L.',
    name: 'Dave L.'
  })
})

test('simple resolver with converter', async () => {
  const userConverterResolver = resolve(
    { name: async (_name, user) => `${user.firstName} ${user.lastName}` },
    {
      converter: async (data) => ({
        firstName: 'Default',
        lastName: 'Name',
        ...data
      }),
    })

  const u = await userConverterResolver.resolve({})

  assert.deepStrictEqual(u, {
    firstName: 'Default',
    lastName: 'Name',
    name: 'Default Name'
  })
})

test('resolving with errors', async () => {
  const dummyResolver = resolve({
    name: async (value) => {
      if (value === 'Dave') {
        throw new Error(`No ${value}s allowed`)
      }
      return value
    },
    age: async (value) => {
      if (value && value < 18) {
        throw new Error('Invalid age')
      }

      return value
    }
  }
  )
  assert.rejects(
    () =>
      dummyResolver.resolve(
        {
          name: 'Dave',
          age: 16
        },
        {}
      ),
    {
      message: 'error',
      data: {
        name: { message: 'No Daves allowed' },
        age: {
          message: 'Invalid age',
        }
      }
    }
  )
})

test('empty resolver returns original data', async () => {
  const resolver = resolve({})
  const data = { message: 'Hello' }
  const resolved = await resolver.resolve(data, {})
  assert.strictEqual(data, resolved)
});

test('nested resolver with array and context', async () => {
  const countryResolver = resolve({
    name: async (value) => value,
    population: async (value) => value,
    flag: async (value) => value,
  }, {
    converter: async (data) => ({
      name: data.toUpperCase(),
      population: 1000000,
      flag: `https://example.com/flags/${data.toLowerCase()}.png`,
    }),
  });

  const addressResolver = resolve({
    street: async (value) => value.toUpperCase(),
    city: async (value) => value.toUpperCase(),
    state: async (value) => value.toUpperCase(),
    country: countryResolver.resolve,
  });

  const userResolver = resolve({
    name: async (value) => value.toUpperCase(),
    age: async (value) => value * 2,
    address: addressResolver.resolve,
    eligable: async (_, user, ctx) => ctx.isEligible(user),
    isDrinkingAge: virtual((value) => value.age > 18)
  });

  const data = {
    name: 'John Doe',
    age: 20,
    address: {
      street: 'Main Street',
      city: 'New York',
      state: 'New York',
      country: 'us',
    },
  };

  const context = {
    isEligible: (value) => value.age > 20,
  };

  const resolvedData = await userResolver.resolve(data, context);

  assert.deepStrictEqual(resolvedData, {
    name: 'JOHN DOE',
    age: 40,
    eligable: false,
    isDrinkingAge: true,
    address: {
      street: 'MAIN STREET',
      city: 'NEW YORK',
      state: 'NEW YORK',
      country: {
        name: 'US',
        population: 1000000,
        flag: 'https://example.com/flags/us.png',
      },
    },
  });

  const datas = [
    {
      name: 'John Doe',
      age: 20,
      address: {
        street: 'Main Street',
        city: 'New York',
        state: 'New York',
        country: 'us',
      },
    },
    {
      name: 'Jane Doe',
      age: 30,
      address: {
        street: 'New Street',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'in',
      },
    },
  ];

  const resolvedDatas = await userResolver.resolve(datas, context);

  assert.deepStrictEqual(resolvedDatas, [
    {
      name: 'JOHN DOE',
      age: 40,
      eligable: false,
      isDrinkingAge: true,
      address: {
        street: 'MAIN STREET',
        city: 'NEW YORK',
        state: 'NEW YORK',
        country: {
          name: 'US',
          population: 1000000,
          flag: 'https://example.com/flags/us.png',
        },
      },
    },
    {
      name: 'JANE DOE',
      age: 60,
      eligable: true,
      isDrinkingAge: true,
      address: {
        street: 'NEW STREET',
        city: 'BANGALORE',
        state: 'KARNATAKA',
        country: {
          name: 'IN',
          population: 1000000,
          flag: 'https://example.com/flags/in.png',
        },
      },
    },
  ]);
});

test('no clobbering with concurrent async resolvers', async () => {
  const count = 50;
  const resolvers = Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `k${i}`,
      async () => {
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 10)));
        return i;
      }
    ])
  );
  const r = resolve(resolvers);
  const out = await r.resolve({});
  assert.strictEqual(Object.keys(out).length, count);
  for (let i = 0; i < count; i++) {
    assert.strictEqual(out[`k${i}`], i);
  }
});

// test('nested resolve should use virtual() to pass context', async () => {
//   const child = resolve({
//     val: async (_v, _obj, ctx) => ctx.suffix
//   });

//   const parentWrong = resolve({
//     child: child.resolve // WRONG: gets (value, obj, ctx)
//   });
//   const outWrong = await parentWrong.resolve({ child: {} }, { suffix: '!' });

//   // undefined fields are omitted, so child has no 'val'
//   assert.deepStrictEqual(outWrong, { child: {} });
//   // or explicitly assert absence:
//   assert.ok(!('val' in outWrong.child));

//   const parentRight = resolve({
//     child: virtual(child.resolve) // CORRECT: calls (obj, ctx)
//   });
//   const outRight = await parentRight.resolve({ child: {} }, { suffix: '!' });
//   assert.deepStrictEqual(outRight, { child: { val: '!' } });
// });

test('converter returning null is treated as {}', async () => {
  const r = resolve(
    { a: async () => 'A' },
    { converter: async () => null }
  );
  const out = await r.resolve({ anything: 'ignored' });
  assert.deepStrictEqual(out, { a: 'A' });
});

test('converter returning undefined is treated as {}', async () => {
  const r = resolve(
    { a: async () => 'A' },
    { converter: async () => undefined }
  );
  const out = await r.resolve({});
  assert.deepStrictEqual(out, { a: 'A' });
});

test('handles undefined input object', async () => {
  const r = resolve({
    a: async () => 'A',
    b: async (v) => (v ?? 'B') // sees undefined -> null in your code, still fine
  });
  const out = await r.resolve(undefined);
  assert.deepStrictEqual(out, { a: 'A', b: 'B' });
});

test('very deep relation population', async () => {
  // Helpers to pass nested value + ctx to child resolvers
  const asChild = (r) => (value, _obj, ctx) => r.resolve(value, ctx);
  const asChildWith = (r, mapper) => (value, obj, ctx) => r.resolve(mapper(value, obj, ctx), ctx);

  // Level 6–8: Country
  const countryResolver = resolve({
    code: async (v) => v,
    name: async (_v, obj, ctx) => ctx.countryName(obj.code),
    flag: async (_v, obj, ctx) => `${ctx.flagBase}/${obj.code.toLowerCase()}.png`,
  }, {
    converter: async (data) => {
      if (typeof data === 'string') return { code: data.toUpperCase() };
      return data || {};
    }
  });

  // Level 5: Address
  const addressResolver = resolve({
    line1: async (v) => v?.toUpperCase(),
    city: async (v) => v?.toUpperCase(),
    zip: async (v) => v,
    country: asChild(countryResolver),
  });

  // Level 4: Profile (receives first/last via mapper below)
  const profileResolver = resolve({
    fullName: async (_v, obj) => `${obj.first} ${obj.last}`.trim(),
    address: asChild(addressResolver),
    first: async () => undefined,   // drop helper fields
    last: async () => undefined,    // drop helper fields
    secret: async () => undefined,  // example of an omitted field
  }, {
    converter: async (data) => ({
      first: data.first ?? data.fname ?? '',
      last: data.last ?? data.lname ?? '',
      address: data.address,
    }),
  });

  // Level 3: Author
  const authorResolver = resolve({
    name: async (_v, obj) => `${obj.first} ${obj.last}`.trim(),
    // Pass author's first/last down to profile so it can compute fullName
    profile: asChildWith(profileResolver, (profile, author) => ({
      ...profile,
      first: author.first,
      last: author.last,
    })),
    first: async () => undefined, // drop raw fields
    last: async () => undefined,
  });

  // Level 3: Publisher
  const publisherResolver = resolve({
    name: async (v) => v.toUpperCase(),
    hq: asChild(addressResolver),
  });

  // Level 2: Book
  const bookResolver = resolve({
    title: async (v) => v.toUpperCase(),
    author: asChild(authorResolver),
    publisher: asChild(publisherResolver),
    draft: async () => undefined, // drop internal field
  });

  // Level 2: Category (array nesting)
  const categoryResolver = resolve({
    name: async (v) => v.toUpperCase(),
    books: async (arr, _obj, ctx) => Promise.all((arr || []).map(b => bookResolver.resolve(b, ctx))),
  });

  // Level 1: Store (root)
  const storeResolver = resolve({
    name: async (v) => v.toUpperCase(),
    location: asChild(addressResolver),
    catalog: async (arr, _obj, ctx) => Promise.all((arr || []).map(c => categoryResolver.resolve(c, ctx))),
  });

  const input = {
    name: 'City Books',
    location: { line1: '123 main', city: 'new york', zip: '10001', country: 'us' },
    catalog: [
      {
        name: 'Science',
        books: [
          {
            title: 'relativity',
            author: { first: 'Albert', last: 'Einstein', profile: { address: { line1: '1 chalk st', city: 'ulm', zip: '89073', country: 'de' } } },
            publisher: { name: 'Princeton Press', hq: { line1: '41 William', city: 'Princeton', zip: '08544', country: 'us' } },
          },
          {
            title: 'computing',
            author: { first: 'Ada', last: 'Lovelace', profile: { address: { line1: '2 logic lane', city: 'london', zip: 'SW1A', country: 'gb' } } },
            publisher: { name: 'London House', hq: { line1: '10 Downing', city: 'London', zip: 'SW1A', country: 'gb' } },
          },
        ],
      },
    ],
  };

  const ctx = {
    countryName: (code) => ({ US: 'United States', DE: 'Germany', GB: 'United Kingdom' }[code]),
    flagBase: 'https://flags.example',
  };

  const out = await storeResolver.resolve(input, ctx);

  assert.deepStrictEqual(out, {
    name: 'CITY BOOKS',
    location: {
      line1: '123 MAIN',
      city: 'NEW YORK',
      zip: '10001',
      country: {
        code: 'US',
        name: 'United States',
        flag: 'https://flags.example/us.png',
      },
    },
    catalog: [
      {
        name: 'SCIENCE',
        books: [
          {
            title: 'RELATIVITY',
            author: {
              name: 'Albert Einstein',
              profile: {
                fullName: 'Albert Einstein',
                address: {
                  line1: '1 CHALK ST',
                  city: 'ULM',
                  zip: '89073',
                  country: {
                    code: 'DE',
                    name: 'Germany',
                    flag: 'https://flags.example/de.png',
                  },
                },
              },
            },
            publisher: {
              name: 'PRINCETON PRESS',
              hq: {
                line1: '41 WILLIAM',
                city: 'PRINCETON',
                zip: '08544',
                country: {
                  code: 'US',
                  name: 'United States',
                  flag: 'https://flags.example/us.png',
                },
              },
            },
          },
          {
            title: 'COMPUTING',
            author: {
              name: 'Ada Lovelace',
              profile: {
                fullName: 'Ada Lovelace',
                address: {
                  line1: '2 LOGIC LANE',
                  city: 'LONDON',
                  zip: 'SW1A',
                  country: {
                    code: 'GB',
                    name: 'United Kingdom',
                    flag: 'https://flags.example/gb.png',
                  },
                },
              },
            },
            publisher: {
              name: 'LONDON HOUSE',
              hq: {
                line1: '10 DOWNING',
                city: 'LONDON',
                zip: 'SW1A',
                country: {
                  code: 'GB',
                  name: 'United Kingdom',
                  flag: 'https://flags.example/gb.png',
                },
              },
            },
          },
        ],
      },
    ],
  });
});