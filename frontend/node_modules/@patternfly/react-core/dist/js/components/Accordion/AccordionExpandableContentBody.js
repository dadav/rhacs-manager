"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccordionExpandableContentBody = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const accordion_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Accordion/accordion"));
const AccordionExpandableContentBody = (_a) => {
    var { children = null } = _a, props = tslib_1.__rest(_a, ["children"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(accordion_1.default.accordionExpandableContentBody) }, props, { children: children })));
};
exports.AccordionExpandableContentBody = AccordionExpandableContentBody;
exports.AccordionExpandableContentBody.displayName = 'AccordionExpandableContentBody';
//# sourceMappingURL=AccordionExpandableContentBody.js.map