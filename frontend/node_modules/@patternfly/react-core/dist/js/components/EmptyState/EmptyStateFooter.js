"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyStateFooter = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const empty_state_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/EmptyState/empty-state"));
const EmptyStateFooter = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(empty_state_1.default.emptyStateFooter, className) }, props, { children: children })));
};
exports.EmptyStateFooter = EmptyStateFooter;
exports.EmptyStateFooter.displayName = 'EmptyStateFooter';
//# sourceMappingURL=EmptyStateFooter.js.map