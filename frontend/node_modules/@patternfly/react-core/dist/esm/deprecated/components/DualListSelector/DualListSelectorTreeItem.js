import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useContext, useEffect, useRef, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { css } from '@patternfly/react-styles';
import { Badge } from '../../../components/Badge';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { flattenTree } from './treeUtils';
import { DualListSelectorListContext } from './DualListSelectorContext';
const DualListSelectorTreeItemBase = (_a) => {
    var { onOptionCheck, children, className, id, text, defaultExpanded, hasBadge, isChecked, checkProps, badgeProps, itemData, isDisabled = false, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useMemo } = _a, props = __rest(_a, ["onOptionCheck", "children", "className", "id", "text", "defaultExpanded", "hasBadge", "isChecked", "checkProps", "badgeProps", "itemData", "isDisabled", "useMemo"]);
    const ref = useRef(null);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded || false);
    const { setFocusedOption } = useContext(DualListSelectorListContext);
    useEffect(() => {
        setIsExpanded(defaultExpanded);
    }, [defaultExpanded]);
    return (_jsxs("li", Object.assign({ className: css(styles.dualListSelectorListItem, className, children && styles.modifiers.expandable, isExpanded && styles.modifiers.expanded, isDisabled && styles.modifiers.disabled), id: id }, props, { "aria-selected": isChecked, role: "treeitem" }, (isExpanded && { 'aria-expanded': 'true' }), { children: [_jsx("div", { className: css(styles.dualListSelectorListItemRow, isChecked && styles.modifiers.selected, styles.modifiers.check), children: _jsx("div", { className: css(styles.dualListSelectorItem), ref: ref, tabIndex: -1, onClick: isDisabled
                        ? undefined
                        : (evt) => {
                            onOptionCheck && onOptionCheck(evt, !isChecked, itemData);
                            setFocusedOption(id);
                        }, children: _jsxs("span", { className: css(styles.dualListSelectorItemMain), children: [children && (_jsx("div", { className: css(styles.dualListSelectorItemToggle), onClick: (e) => {
                                    if (children) {
                                        setIsExpanded(!isExpanded);
                                    }
                                    e.stopPropagation();
                                }, onKeyDown: (e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        document.activeElement.click();
                                        e.preventDefault();
                                    }
                                }, tabIndex: -1, children: _jsx("span", { className: css(styles.dualListSelectorItemToggleIcon), children: _jsx(AngleRightIcon, {}) }) })), _jsx("span", { className: css(styles.dualListSelectorItemCheck), children: _jsx("input", Object.assign({ type: "checkbox", onChange: (evt) => {
                                        onOptionCheck && onOptionCheck(evt, !isChecked, itemData);
                                        setFocusedOption(id);
                                    }, onClick: (evt) => evt.stopPropagation(), onKeyDown: (e) => {
                                        if (e.key === ' ' || e.key === 'Enter') {
                                            onOptionCheck && onOptionCheck(e, !isChecked, itemData);
                                            setFocusedOption(id);
                                            e.preventDefault();
                                        }
                                    }, ref: (elem) => {
                                        elem && (elem.indeterminate = isChecked === null);
                                    }, checked: isChecked || false, tabIndex: -1 }, checkProps)) }), _jsx("span", { className: css(styles.dualListSelectorItemText), children: text }), hasBadge && children && (_jsx("span", { className: css(styles.dualListSelectorItemCount), children: _jsx(Badge, Object.assign({}, badgeProps, { children: flattenTree(children.props.data).length })) }))] }) }) }), isExpanded && children] })));
};
export const DualListSelectorTreeItem = memo(DualListSelectorTreeItemBase, (prevProps, nextProps) => {
    if (!nextProps.useMemo) {
        return false;
    }
    if (prevProps.className !== nextProps.className ||
        prevProps.text !== nextProps.text ||
        prevProps.id !== nextProps.id ||
        prevProps.defaultExpanded !== nextProps.defaultExpanded ||
        prevProps.checkProps !== nextProps.checkProps ||
        prevProps.hasBadge !== nextProps.hasBadge ||
        prevProps.badgeProps !== nextProps.badgeProps ||
        prevProps.isChecked !== nextProps.isChecked ||
        prevProps.itemData !== nextProps.itemData) {
        return false;
    }
    return true;
});
DualListSelectorTreeItem.displayName = 'DualListSelectorTreeItem';
//# sourceMappingURL=DualListSelectorTreeItem.js.map