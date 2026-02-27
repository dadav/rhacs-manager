"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormAlert = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const FormAlert = (_a) => {
    var { children = null, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return (
    // There are currently no associated styles with the pf-v6-c-form_alert class.
    // Therefore, it does not exist in react-styles
    (0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(`${form_1.default.form}__alert`, className), children: children })));
};
exports.FormAlert = FormAlert;
exports.FormAlert.displayName = 'FormAlert';
//# sourceMappingURL=FormAlert.js.map