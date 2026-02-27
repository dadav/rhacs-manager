"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescriptionListDescription = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const description_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DescriptionList/description-list"));
const react_styles_1 = require("@patternfly/react-styles");
const DescriptionListDescription = (_a) => {
    var { children = null, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("dd", Object.assign({ className: (0, react_styles_1.css)(description_list_1.default.descriptionListDescription, className) }, props, { children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(description_list_1.default.descriptionListText), children: children }) })));
};
exports.DescriptionListDescription = DescriptionListDescription;
exports.DescriptionListDescription.displayName = 'DescriptionListDescription';
//# sourceMappingURL=DescriptionListDescription.js.map