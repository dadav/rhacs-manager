"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabTitleText = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const tabs_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tabs/tabs"));
const TabTitleText = (_a) => {
    var { children, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("span", Object.assign({ className: (0, react_styles_1.css)(tabs_1.default.tabsItemText, className) }, props, { children: children })));
};
exports.TabTitleText = TabTitleText;
exports.TabTitleText.displayName = 'TabTitleText';
//# sourceMappingURL=TabTitleText.js.map