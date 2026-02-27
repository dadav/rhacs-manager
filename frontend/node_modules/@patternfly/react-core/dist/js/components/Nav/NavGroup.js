"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const nav_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Nav/nav"));
const react_styles_1 = require("@patternfly/react-styles");
const util_1 = require("../../helpers/util");
const NavGroup = (_a) => {
    var { title, children = null, className = '', id = (0, util_1.getUniqueId)() } = _a, props = tslib_1.__rest(_a, ["title", "children", "className", "id"]);
    if (!title && !props['aria-label']) {
        // eslint-disable-next-line no-console
        console.warn("For accessibility reasons an aria-label should be specified on nav groups if a title isn't");
    }
    const labelledBy = title ? id : undefined;
    return ((0, jsx_runtime_1.jsxs)("section", Object.assign({ className: (0, react_styles_1.css)(nav_1.default.navSection, className), "aria-labelledby": labelledBy }, props, { children: [title && ((0, jsx_runtime_1.jsx)("h2", { className: (0, react_styles_1.css)(nav_1.default.navSectionTitle), id: id, children: title })), (0, jsx_runtime_1.jsx)("ul", { className: (0, react_styles_1.css)(nav_1.default.navList, className), role: "list", children: children })] })));
};
exports.NavGroup = NavGroup;
exports.NavGroup.displayName = 'NavGroup';
//# sourceMappingURL=NavGroup.js.map