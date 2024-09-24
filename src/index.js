const resolve = (resolvers, options = {}) => ({
  resolve: async (obj, context) => {
    if (!Object.keys(resolvers).length) return obj;

    const resolver = async (resolverObj) => {
      const errors = {};
      let resolvedFields = {};
      resolverObj = await (options.converter ? options.converter(resolverObj, context) : resolverObj);
      const fieldsToResolve = new Set([...Object.keys(resolverObj), ...Object.keys(resolvers)]);

      await Promise.all(
        Array.from(fieldsToResolve).map(async (field) => {
          const value = resolverObj[field] ?? null;
          if (resolvers[field]) {
            try {
              const resolvedValue = await resolvers[field](value, resolverObj, context);
              resolvedFields = { ...resolvedFields, ...(resolvedValue !== undefined ? { [field]: resolvedValue } : {}) };
            } catch (error) {
              errors[field] = { message: error.message };
            }
          } else {
            resolvedFields = { ...resolvedFields, [field]: value };
          }
        })
      );

      if (Object.keys(errors).length) {
        const err = new Error('error');
        err.data = errors;
        throw err;
      }

      return resolvedFields;
    };

    return Array.isArray(obj) ? Promise.all(obj.map(resolver)) : resolver(obj);
  }
});

const virtual = (resolver) => (_, obj, context) => resolver(obj, context);

export { resolve, virtual }