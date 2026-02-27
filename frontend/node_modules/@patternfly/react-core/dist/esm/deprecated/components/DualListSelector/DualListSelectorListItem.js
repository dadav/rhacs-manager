import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useContext, useRef } from 'react';
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { css } from '@patternfly/react-styles';
import { getUniqueId } from '../../../helpers';
import GripVerticalIcon from '@patternfly/react-icons/dist/esm/icons/grip-vertical-icon';
import { Button, ButtonVariant } from '../../../components/Button';
import { DualListSelectorListContext } from './DualListSelectorContext';
export const DualListSelectorListItemBase = (_a) => {
    var { onOptionSelect, orderIndex, children, className, id = getUniqueId('dual-list-selector-list-item'), isSelected, innerRef, isDraggable = false, isDisabled, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    draggableButtonAriaLabel = 'Reorder option' } = _a, props = __rest(_a, ["onOptionSelect", "orderIndex", "children", "className", "id", "isSelected", "innerRef", "isDraggable", "isDisabled", "draggableButtonAriaLabel"]);
    const privateRef = useRef(null);
    const ref = innerRef || privateRef;
    const { setFocusedOption } = useContext(DualListSelectorListContext);
    return (_jsx("li", Object.assign({ className: css(styles.dualListSelectorListItem, className, isDisabled && styles.modifiers.disabled), onClick: isDisabled
            ? undefined
            : (e) => {
                setFocusedOption(id);
                onOptionSelect(e, id);
            }, onKeyDown: (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                document.activeElement.click();
                e.preventDefault();
            }
        }, "aria-selected": isSelected, id: id, ref: ref, role: "option", tabIndex: -1 }, props, { children: _jsxs("div", { className: css(styles.dualListSelectorListItemRow, isSelected && styles.modifiers.selected), children: [isDraggable && !isDisabled && (_jsx("div", { className: css(styles.dualListSelectorDraggable), children: _jsx(Button, { variant: ButtonVariant.plain, component: "span", icon: _jsx(GripVerticalIcon, { style: { verticalAlign: '-0.3em' } }) }) })), _jsx("span", { className: css(styles.dualListSelectorItem), children: _jsx("span", { className: css(styles.dualListSelectorItemMain), children: _jsx("span", { className: css(styles.dualListSelectorItemText), children: children }) }) })] }) }), orderIndex));
};
DualListSelectorListItemBase.displayName = 'DualListSelectorListItemBase';
export const DualListSelectorListItem = forwardRef((props, ref) => (_jsx(DualListSelectorListItemBase, Object.assign({ innerRef: ref }, props))));
DualListSelectorListItem.displayName = 'DualListSelectorListItem';
//# sourceMappingURL=DualListSelectorListItem.js.map