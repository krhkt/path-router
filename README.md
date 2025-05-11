# Path Router

The **Path Router** is a module to instantiate and run javascript classes and methods from a path string.


It's composed of 3 main parts:
- a **Route**, that maps a string template to a function (or a handler instance)
- a **Router**, that can hold many **routes** and checks a given "path string" against each of its **routes** until it finds a match, or no match at all
- a **Handler**, that can be a function or an object with a public `execute` method as part of its interface, that will be invoked by the **router** when a **route** matches a given `"path string"`


## Simple usage

The simplest way to start using the module is by creating a **Router**, adding **Route**s to it, and letting the **DefaultHandler** execute any matching "path string".

Example:

```js
    const baseControllerPath = `${__dirname}/controller`;

    // using the default handler and providing the folder where to find the controllers to instantiate
    const router = new PathRouter({
        defaultRouteHandler: new PathRouteDefaultHandler(baseControllerPath),
    }); 

    // add any desired route
    router
        .addRoute({
            name: 'single-app',
            path: 'app:{*appRoute}',
            defaults: { appRoute: '' },
        })
        .addRoute({
            name: 'default',
            path: '{controller}:{action}:{id}',
            defaults: {
                controller: 'home',
                action: 'index',
                id: '',
            },
        });

    // execute the path string:
    //  the following path string will result in:
    //  - the instantiation of the UserController class,
    //  - then the invocation of userControllerInstance.new()
    await router.executeRoute('users:new');
```

## Routes

A route uses a template string that can be tested against a path string to check if it's a match. It also allows a path string to be built by providing the necessary parameters.

### Route path string templates

A route has a property called `path` that describes the matching template to a given `"path string"`. If the template, matches the path string, that route is a match and will execute the associated handler with the matched params.

The templates use curly braces `{}` to describe a part of the route that should be captured as a named param to the handler. It can be placed in any part of the path template.

For instance, let's use the following path template of a route:
- `file_path/{fileName}.txt`:
    - will match path strings starting with `file_path/`, and ending with `.txt`
    - everything in the middle will be captured and assigned to a `fileName` property of the params object, unless the string contains a defined separator, which in this case is `/`.

Note: the default separator can be configured in the `Router` by the property `routeSeparator` that defaults to `:`.

To make routes that match even separators as a named param, use the Greedy operator `*`.

- `images/{*anyPath}`:
    - will match path string starting with `images/`
    - will capture everything after the first `/`, including separtors (`/`), and assign the captured value to the `anyPath` property of the params object.

### Route constraints

The named params present in a path template can have an associated constraint that will be a validator against the given path string. If the validation is not satisfied, then the route is not considered a match.

The `PathRoute` class provides a few default constraints, but it's possible to use a function or a regular expression as validators instead.

#### Provided named params constraints

- `PathRoute.NumericParam`: accepts a strings of digits. E.g.: `123`, `09230`, `0000`, `23981`
- `PathRoute.NumberParam`: accepts a number with an optional sign as the first character. E.g.: `12`, `+53`, `-534534`
- `PathRoute.WordParam`: accepts any combination of characters that are letters (`a-zA-Z`), digits (`0-9`), or underscore (`_`)
- `PathRoute.AlphaParam`: accepts letters and empty strings
- `PathRoute.AlphaNumericParam`: accepts letters and digits only
- `PathRoute.NonDigitParam`: accepts everything except digits
- `PathRoute.OptionalParam`: makes the param existence optional in the route

All provided constraints are simple regular expressions that can be found in the `PathRoute` class.

## Router



## Default handler
