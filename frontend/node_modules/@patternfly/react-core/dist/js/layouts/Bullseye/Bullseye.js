"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bullseye = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const bullseye_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/layouts/Bullseye/bullseye"));
const Bullseye = (_a) => {
    var { children = null, className = '', component = 'div' } = _a, props = tslib_1.__rest(_a, ["children", "className", "component"]);
    const Component = component;
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({ className: (0, react_styles_1.css)(bullseye_1.default.bullseye, className) }, props, { children: children })));
};
exports.Bullseye = Bullseye;
exports.Bullseye.displayName = 'Bullseye';
//# sourceMappingURL=Bullseye.js.map