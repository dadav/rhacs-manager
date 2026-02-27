"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleListGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const simple_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/SimpleList/simple-list"));
const SimpleListGroup = (_a) => {
    var { children = null, className = '', title = '', titleClassName = '', id = '' } = _a, props = tslib_1.__rest(_a, ["children", "className", "title", "titleClassName", "id"]);
    return ((0, jsx_runtime_1.jsxs)("section", Object.assign({ className: (0, react_styles_1.css)(simple_list_1.default.simpleListSection) }, props, { children: [(0, jsx_runtime_1.jsx)("h2", { id: id, className: (0, react_styles_1.css)(simple_list_1.default.simpleListTitle, titleClassName), "aria-hidden": "true", children: title }), (0, jsx_runtime_1.jsx)("ul", { className: (0, react_styles_1.css)('pf-v6-c-simple-list__list', className), role: "list", "aria-labelledby": id, children: children })] })));
};
exports.SimpleListGroup = SimpleListGroup;
exports.SimpleListGroup.displayName = 'SimpleListGroup';
//# sourceMappingURL=SimpleListGroup.js.map