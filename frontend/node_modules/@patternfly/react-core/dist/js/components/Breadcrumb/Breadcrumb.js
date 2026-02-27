"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Breadcrumb = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const breadcrumb_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Breadcrumb/breadcrumb"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
const Breadcrumb = (_a) => {
    var { children = null, className = '', 'aria-label': ariaLabel = 'Breadcrumb', ouiaId, ouiaSafe = true } = _a, props = tslib_1.__rest(_a, ["children", "className", 'aria-label', "ouiaId", "ouiaSafe"]);
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.Breadcrumb.displayName, ouiaId, ouiaSafe);
    return ((0, jsx_runtime_1.jsx)("nav", Object.assign({}, props, { "aria-label": ariaLabel, className: (0, react_styles_1.css)(breadcrumb_1.default.breadcrumb, className) }, ouiaProps, { children: (0, jsx_runtime_1.jsx)("ol", { className: breadcrumb_1.default.breadcrumbList, role: "list", children: react_1.Children.map(children, (child, index) => {
                const showDivider = index > 0;
                if ((0, react_1.isValidElement)(child)) {
                    return (0, react_1.cloneElement)(child, { showDivider });
                }
                return child;
            }) }) })));
};
exports.Breadcrumb = Breadcrumb;
exports.Breadcrumb.displayName = 'Breadcrumb';
//# sourceMappingURL=Breadcrumb.js.map