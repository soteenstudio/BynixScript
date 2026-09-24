# What is BynixScript?
Simply put, BynixScript is a programming language created by SoTeen Studio. For more details, you can see the documentation.

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Website](https://img.shields.io/badge/official-website-blue)](https://unggasstudio.github.io/bynixscript/)
[![Documentation](https://img.shields.io/badge/Documentation-8A2BE2)](docs/markdown/documentation.md)
[![Youtube](https://img.shields.io/badge/YouTube-Channel-orange)](https://youtube.com/@unggas-studio?si=rwzB7AXjr-jCqg_J)
[![Package](https://img.shields.io/npm/dw/bynixscript)](https://www.npmjs.com/package/bynixscript?activeTab=readme)

> **Caution:** Please avoid using versions v0.0.1-next to v0.2.1-next as they contain known issues. v0.2.2-next will be released soon with improvements.

## Share experiences
If you want to share your experience using BynixScript, you can go to the [form](https://docs.google.com/forms/d/e/1FAIpQLSf-PJBXod_6suXEPr2no5NbY_19JQldvOkWV6LcwCzKP2UO8A/viewform) page.

## Installation
### Using NPM <a name="using-npm-installation"></a>
```
npm install -g bynixscript
```
### Using CDN <a name="using-cdn-installation"></a>
```html
<script src="https://cdn.jsdelivr.net/npm/bynixscript"></script>
```
## Get Started
### Using NPM <a name="using-npm-get-started"></a>
Run a BynixScript file:
```
bynix run path/to/script.bys
```
Compile a BynixScript file:
```
bynix compile path/to/script.bys
```
The compiled JavaScript is written next to the source file (`script.js`, or `script.mjs` for `.mbs`).
To print translated JavaScript without running it:
```
bynix print path/to/script.bys
```
To delete a file (an explicit file path is required):
```
bynix delete path/to/script.bys
```
Run `bynix --help` or `bynix run --help` for usage. The default supported extensions are `.bys`, `.bynixscript`, and `.mbs`.

To build the packaged executable from source while developing:
```
npm ci
npm run build
npm test
```
### Using CDN <a name="using-cdn-get-started"></a>
```html
<bynix>
  const message = "Hello from BynixScript!"
  print(message)
</bynix>
```
## Extension
If you want to change your experience use BynixScript to good experience. You can use the below extensions for VSCode:
- [Download](https://github.com/UngGasStudio/BynixScript-Extension)
## Example
```javascript
class Person:
  constructor(name, age):
    this.name = name
    this.age = age
  end
  
  speak():
    print(`My name is ${this.name} and I'm still ${this.age} years ago`)
  end
end

class Introduction extends Person:
  constructor(name, age, hobby):
    super(name, age)
    this.hobby = hobby
  end
  
  speak():
    print(`My name is ${this.name}, I'm still ${this.age} years ago and I like ${this.hobby}`)
  end
end

const person = new Introduction("Clay", 14, "Coding")
person.speak()
```
BynixScript code examples are not limited to that, BynixScript still has other examples that you can see on the [example](docs/markdown/example.md) page
## Table of content
- [What Is BynixScript](#What-Is-BynixScript)
  - [Share experiences](#Share-experiences)
  - [Installation](#Installation)
      - [Using NPM](#using-npm-installation)
      - [Using CDN](#using-cdn-installation)
  - [Get Started](#Get-Started)
      - [Using NPM](#using-npm-get-started)
      - [Using CDN](#using-cdn-get-started)
  - [Extension](#Extension)
  - [Example](#Example)
  - [Table of content](#Table-of-content)
  - [Function](#Function)
  - [Changelog](#Changelog)
  - [Roadmap](#Roadmap)
## Function
BynixScript provides many functions, such as for-to:
```javascript
for i=0 to 5:
  print("Loop to " + i)
end
```
You can see all the functions like condition, flow control, exception, etc. in the [function list](docs/markdown/function.md).
## Changelog
You can see all the changes made in BynixScript itself, as well as its Extensions in VSCode.
- [BynixScript](https://github.com/UngGas-Studio/BynixScript/releases)
- [Extension](https://github.com/UngGas-Studio/BynixScript-Extension/releases)
## Roadmap
So that you know what the purpose of this programming language is in the future. You can see the [roadmap](docs/markdown/roadmap.md)
