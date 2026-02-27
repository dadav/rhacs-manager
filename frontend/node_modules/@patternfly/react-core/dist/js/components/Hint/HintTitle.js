"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HintTitle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const hint_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Hint/hint"));
const react_styles_1 = require("@patternfly/react-styles");
const HintTitle = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(hint_1.default.hintTitle, className) }, props, { children: children })));
};
exports.HintTitle = HintTitle;
exports.HintTitle.displayName = 'HintTitle';
//# sourceMappingURL=HintTitle.js.map