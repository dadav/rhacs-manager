"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelFooter = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const panel_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Panel/panel"));
const react_styles_1 = require("@patternfly/react-styles");
const PanelFooter = (_a) => {
    var { className, children } = _a, props = tslib_1.__rest(_a, ["className", "children"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(panel_1.default.panelFooter, className) }, props, { children: children })));
};
exports.PanelFooter = PanelFooter;
exports.PanelFooter.displayName = 'PanelFooter';
//# sourceMappingURL=PanelFooter.js.map