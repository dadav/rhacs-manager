"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tab_content_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TabContent/tab-content"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
const TabsContext_1 = require("./TabsContext");
const variantStyle = {
    default: '',
    secondary: tab_content_1.default.modifiers.secondary
};
const TabContentBase = (_a) => {
    var { id, activeKey, 'aria-label': ariaLabel, child, children, className, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventKey, innerRef, ouiaId, ouiaSafe } = _a, props = tslib_1.__rest(_a, ["id", "activeKey", 'aria-label', "child", "children", "className", "eventKey", "innerRef", "ouiaId", "ouiaSafe"]);
    if (children || child) {
        let labelledBy;
        if (ariaLabel) {
            labelledBy = null;
        }
        else {
            labelledBy = children ? `${id}` : `pf-tab-${child.props.eventKey}-${id}`;
        }
        return ((0, jsx_runtime_1.jsx)(TabsContext_1.TabsContextConsumer, { children: ({ variant }) => {
                const variantClass = variantStyle[variant];
                return ((0, jsx_runtime_1.jsx)("section", Object.assign({ ref: innerRef, hidden: children ? null : child.props.eventKey !== activeKey, className: children
                        ? (0, react_styles_1.css)(tab_content_1.default.tabContent, className, variantClass)
                        : (0, react_styles_1.css)(tab_content_1.default.tabContent, child.props.className, variantClass), id: children ? id : `pf-tab-section-${child.props.eventKey}-${id}`, "aria-label": ariaLabel, "aria-labelledby": labelledBy, role: "tabpanel", tabIndex: 0 }, (0, helpers_1.getOUIAProps)('TabContent', ouiaId, ouiaSafe), props, { children: children || child.props.children })));
            } }));
    }
    return null;
};
exports.TabContent = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(TabContentBase, Object.assign({}, props, { innerRef: ref }))));
//# sourceMappingURL=TabContent.js.map