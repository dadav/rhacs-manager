"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlock = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const code_block_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/CodeBlock/code-block"));
const react_styles_1 = require("@patternfly/react-styles");
const CodeBlock = (_a) => {
    var { children = null, className, actions = null } = _a, props = tslib_1.__rest(_a, ["children", "className", "actions"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(code_block_1.default.codeBlock, className) }, props, { children: [actions && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(code_block_1.default.codeBlockHeader), children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(code_block_1.default.codeBlockActions), children: actions }) })), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(code_block_1.default.codeBlockContent), children: children })] })));
};
exports.CodeBlock = CodeBlock;
exports.CodeBlock.displayName = 'CodeBlock';
//# sourceMappingURL=CodeBlock.js.map