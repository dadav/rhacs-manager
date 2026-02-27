"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpandableSectionToggle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const expandable_section_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ExpandableSection/expandable-section"));
const react_styles_1 = require("@patternfly/react-styles");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const Button_1 = require("../Button");
const ExpandableSectionToggle = (_a) => {
    var { children, className = '', isExpanded = false, onToggle, contentId, toggleId, direction = 'down', hasTruncatedContent = false, isDetached } = _a, props = tslib_1.__rest(_a, ["children", "className", "isExpanded", "onToggle", "contentId", "toggleId", "direction", "hasTruncatedContent", "isDetached"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(expandable_section_1.default.expandableSection, isExpanded && expandable_section_1.default.modifiers.expanded, hasTruncatedContent && expandable_section_1.default.modifiers.truncate, isDetached && 'pf-m-detached', className) }, props, { children: (0, jsx_runtime_1.jsx)("div", { className: `${expandable_section_1.default.expandableSection}__toggle`, children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: "link" }, (hasTruncatedContent && { isInline: true }), { "aria-expanded": isExpanded, "aria-controls": contentId, onClick: () => onToggle(!isExpanded), id: toggleId }, (!hasTruncatedContent && {
                icon: ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(expandable_section_1.default.expandableSectionToggleIcon, isExpanded && direction === 'up' && expandable_section_1.default.modifiers.expandTop // TODO: next breaking change move this class to the outer styles.expandableSection wrapper
                    ), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }))
            }), { children: children })) }) })));
};
exports.ExpandableSectionToggle = ExpandableSectionToggle;
exports.ExpandableSectionToggle.displayName = 'ExpandableSectionToggle';
//# sourceMappingURL=ExpandableSectionToggle.js.map