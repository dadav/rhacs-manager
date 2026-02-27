"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSection = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const react_styles_1 = require("@patternfly/react-styles");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const FormSection = (_a) => {
    var { className = '', children, title = '', titleElement: TitleElement = 'div' } = _a, props = tslib_1.__rest(_a, ["className", "children", "title", "titleElement"]);
    return ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { prefix: "pf-form-section-title", children: (sectionId) => ((0, jsx_runtime_1.jsxs)("section", Object.assign({ className: (0, react_styles_1.css)(form_1.default.formSection, className), role: "group" }, (title && { 'aria-labelledby': sectionId }), props, { children: [title && ((0, jsx_runtime_1.jsx)(TitleElement, { id: sectionId, className: (0, react_styles_1.css)(form_1.default.formSectionTitle, className), children: title })), children] }))) }));
};
exports.FormSection = FormSection;
exports.FormSection.displayName = 'FormSection';
//# sourceMappingURL=FormSection.js.map