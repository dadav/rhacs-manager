"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastheadLogo = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const masthead_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Masthead/masthead"));
const react_styles_1 = require("@patternfly/react-styles");
const MastheadLogo = (_a) => {
    var { children, className, component } = _a, props = tslib_1.__rest(_a, ["children", "className", "component"]);
    let Component = component;
    if (!component) {
        if ((props === null || props === void 0 ? void 0 : props.href) !== undefined) {
            Component = 'a';
        }
        else {
            Component = 'span';
        }
    }
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({ className: (0, react_styles_1.css)(masthead_1.default.mastheadLogo, className) }, (Component === 'a' && { tabIndex: 0 }), props, { children: children })));
};
exports.MastheadLogo = MastheadLogo;
exports.MastheadLogo.displayName = 'MastheadLogo';
//# sourceMappingURL=MastheadLogo.js.map