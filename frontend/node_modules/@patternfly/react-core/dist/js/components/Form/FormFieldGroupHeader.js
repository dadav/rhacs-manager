"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormFieldGroupHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const react_styles_1 = require("@patternfly/react-styles");
const FormFieldGroupHeader = (_a) => {
    var { className, titleText, titleDescription, actions } = _a, props = tslib_1.__rest(_a, ["className", "titleText", "titleDescription", "actions"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(form_1.default.formFieldGroupHeader, className) }, props, { children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(form_1.default.formFieldGroupHeaderMain), children: [titleText && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formFieldGroupHeaderTitle), children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formFieldGroupHeaderTitleText), id: titleText.id, children: titleText.text }) })), titleDescription && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formFieldGroupHeaderDescription), children: titleDescription })] }), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formFieldGroupHeaderActions), children: actions && actions })] })));
};
exports.FormFieldGroupHeader = FormFieldGroupHeader;
exports.FormFieldGroupHeader.displayName = 'FormFieldGroupHeader';
//# sourceMappingURL=FormFieldGroupHeader.js.map