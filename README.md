# UResolver

## JSON resolver

[![tests](https://github.com/kethan/uresolver/actions/workflows/node.js.yml/badge.svg)](https://github.com/kethan/uresolver/actions/workflows/node.js.yml) [![Version](https://img.shields.io/npm/v/uresolver.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uresolver) [![Badge size](https://deno.bundlejs.com/badge?q=uresolver&treeshake=[*]&config={"compression":"brotli"})](https://unpkg.com/uresolver) [![Badge size](https://deno.bundlejs.com/badge?q=uresolver&treeshake=[*]&config={"compression":"gzip"})](https://unpkg.com/uresolver)

## Overview

The `resolve` function is a utility designed to process and resolve fields of an object or an array of objects. It allows you to define custom resolvers for specific fields and provides an option to convert objects before resolving them. This function is useful for transforming data structures in a flexible and modular way.

## Installation

**yarn**: `yarn add uresolver`

**npm**: `npm i uresolver`

**cdn**: https://unpkg.com/uresolver

**module**: https://unpkg.com/uresolver?module

To use the `resolve` function in your project, simply import it from your module:

```javascript
import { resolve, virtual } from "uresolver";
```

## Usage

### Basic Usage

To use the `resolve` function, you need to define a set of resolvers for the fields you want to process. Each resolver is an asynchronous function that receives the field's value, the entire object being resolved, and the context. The `resolve` function returns a resolver object with a `resolve` method.

```javascript
const resolvers = {
	name: async (value) => value.toUpperCase(),
	age: async (value) => value + 1,
};

const resolver = resolve(resolvers);

const data = { name: "Alice", age: 30 };

resolver.resolve(data, {}).then((resolved) => {
	console.log(resolved); // Output: { name: 'ALICE', age: 31 }
});
```

### Using the Converter Option

You can provide a `converter` function in the options to transform objects before resolving them. The `converter` function receives the object and the context as arguments.

```javascript
const converter = (data) => ({ ...data, converted: true });

const resolvers = {
	name: async (value) => value.toUpperCase(),
};

const resolver = resolve(resolvers, { converter });

const data = { name: "Alice" };

resolver.resolve(data, {}).then((resolved) => {
	console.log(resolved); // Output: { name: 'ALICE', converted: true }
});
```

### Handling Nested Resolvers

The `resolve` function can handle nested objects by defining nested resolvers.

```javascript
const resolvers = {
	name: async (value) => value.toUpperCase(),
	address: resolve({
		city: async (value) => value.toUpperCase(),
	}).resolve,
};

const resolver = resolve(resolvers);

const data = { name: "Bob", address: { city: "san francisco" } };

resolver.resolve(data, {}).then((resolved) => {
	console.log(resolved); // Output: { name: 'BOB', address: { city: 'SAN FRANCISCO' } }
});
```

### Array Conversion

The `resolve` function can process arrays of objects.

```javascript
const converter = (data) => {
	if (Array.isArray(data.items)) {
		data.items = data.items.map((item) => ({ ...item, converted: true }));
	}
	return data;
};

const resolvers = {
	items: async (value) => value,
};

const resolver = resolve(resolvers, { converter });

const data = {
	items: [
		{ name: "item1", price: 10 },
		{ name: "item2", price: 20 },
	],
};

resolver.resolve(data, {}).then((resolved) => {
	console.log(resolved);
	// Output: { items: [{ name: 'item1', price: 10, converted: true }, { name: 'item2', price: 20, converted: true }] }
});
```

### Error Handling in Converter

If the `converter` function throws an error, it will be caught and handled appropriately.

```javascript
const converter = (data) => {
	if (data.name === "Dave") {
		throw new Error("Conversion error");
	}
	return data;
};

const resolvers = {
	name: async (value) => value.toUpperCase(),
};

const resolver = resolve(resolvers, { converter });

resolver.resolve({ name: "Dave" }, {}).catch((err) => {
	console.error(err.message); // Output: Conversion error
});
```

### Using Virtual Fields

The `virtual` utility allows you to define fields that are computed dynamically based on other fields in the object or additional context.

#### Example

```javascript
const virtual = (resolver) => async (value, obj, context) => {
	return resolver(obj, context);
};

const userResolver = resolve({
	isDrinkingAge: virtual(async (user, context) => {
		const drinkingAge = await context.getDrinkingAge(user.country);
		return user.age >= drinkingAge;
	}),
	fullName: virtual((user, context) => {
		return `${user.firstName} ${user.lastName}`;
	}),
});

const context = {
	getDrinkingAge: async (country) => {
		const drinkingAges = {
			USA: 21,
			UK: 18,
			France: 18,
			Germany: 16,
		};
		return drinkingAges[country] || 18;
	},
};

const data = {
	firstName: "John",
	lastName: "Doe",
	age: 20,
	country: "USA",
};

userResolver.resolve(data, context).then((resolved) => {
	console.log(resolved);
	// Output: { isDrinkingAge: false, fullName: 'John Doe' }
});
```

## API

### `resolve(resolvers, options)`

#### Parameters

- `resolvers` (Object): An object where each key is a field name and each value is an asynchronous resolver function.
- `options` (Object): Optional settings.
  - `converter` (Function): A function to convert objects before resolving. Receives the object and context as arguments.

#### Returns

An object with a `resolve` method.

### `resolve.resolve(obj, context)`

#### Parameters

- `obj` (Object|Array): The object or array of objects to resolve.
- `context` (Object): An optional context object passed to resolver functions.

#### Returns

A Promise that resolves to the transformed object or array of objects.

### `virtual(resolver)`

#### Parameters

- `obj` (Object|Array): The object or array of objects to resolve.
- `context` (Object): An optional context object passed to resolver functions.

#### Returns

A function that can be used as a resolver in the resolve function.

## Example

```javascript
const converter = (data) => ({ ...data, converted: true });

const resolvers = {
	name: async (value) => value.toUpperCase(),
	age: async (value) => value + 1,
};

const resolver = resolve(resolvers, { converter });

const data = { name: "Alice", age: 30 };

resolver.resolve(data, {}).then((resolved) => {
	console.log(resolved); // Output: { name: 'ALICE', age: 31, converted: true }
});
```

## License

This project is licensed under the MIT License.