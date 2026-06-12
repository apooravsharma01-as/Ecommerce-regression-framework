const CodebaseScanner =
    require(
        './agents/scanner/CodebaseScanner'
    );

const result =
    CodebaseScanner.scan();

console.log(
    JSON.stringify(
        result,
        null,
        2
    )
);