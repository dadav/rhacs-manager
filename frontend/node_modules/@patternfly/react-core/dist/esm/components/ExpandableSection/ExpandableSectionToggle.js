import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/ExpandableSection/expandable-section.mjs';
import { css } from '@patternfly/react-styles';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { Button } from '../Button';
export const ExpandableSectionToggle = (_a) => {
    var { children, className = '', isExpanded = false, onToggle, contentId, toggleId, direction = 'down', hasTruncatedContent = false, isDetached } = _a, props = __rest(_a, ["children", "className", "isExpanded", "onToggle", "contentId", "toggleId", "direction", "hasTruncatedContent", "isDetached"]);
    return (_jsx("div", Object.assign({ className: css(styles.expandableSection, isExpanded && styles.modifiers.expanded, hasTruncatedContent && styles.modifiers.truncate, isDetached && 'pf-m-detached', className) }, props, { children: _jsx("div", { className: `${styles.expandableSection}__toggle`, children: _jsx(Button, Object.assign({ variant: "link" }, (hasTruncatedContent && { isInline: true }), { "aria-expanded": isExpanded, "aria-controls": contentId, onClick: () => onToggle(!isExpanded), id: toggleId }, (!hasTruncatedContent && {
                icon: (_jsx("span", { className: css(styles.expandableSectionToggleIcon, isExpanded && direction === 'up' && styles.modifiers.expandTop // TODO: next breaking change move this class to the outer styles.expandableSection wrapper
                    ), children: _jsx(AngleRightIcon, {}) }))
            }), { children: children })) }) })));
};
ExpandableSectionToggle.displayName = 'ExpandableSectionToggle';
//# sourceMappingURL=ExpandableSectionToggle.js.map