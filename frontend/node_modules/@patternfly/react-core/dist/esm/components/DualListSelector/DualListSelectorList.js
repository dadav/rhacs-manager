import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useContext } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { DualListSelectorListItem } from './DualListSelectorListItem';
import { DualListSelectorListContext } from './DualListSelectorContext';
export const DualListSelectorListBase = (_a) => {
    var { children, innerRef } = _a, props = __rest(_a, ["children", "innerRef"]);
    const { isTree, ariaLabelledBy, focusedOption, displayOption, selectedOptions, id, options, isDisabled } = useContext(DualListSelectorListContext);
    const hasOptions = () => options.length !== 0 || (children !== undefined && children.length !== 0);
    return (_jsx("ul", Object.assign({ className: css(styles.dualListSelectorList) }, (hasOptions() && {
        role: isTree ? 'tree' : 'listbox',
        'aria-multiselectable': true,
        'aria-labelledby': ariaLabelledBy,
        'aria-activedescendant': focusedOption
    }), { "aria-disabled": isDisabled ? 'true' : undefined, ref: innerRef }, props, { children: options.length === 0
            ? children
            : options.map((option, index) => {
                if (displayOption(option)) {
                    return (_jsx(DualListSelectorListItem, { isSelected: selectedOptions.indexOf(index) !== -1, id: `${id}-option-${index}`, orderIndex: index, isDisabled: isDisabled, children: option }, index));
                }
                return;
            }) })));
};
DualListSelectorListBase.displayName = 'DualListSelectorListBase';
export const DualListSelectorList = forwardRef((props, ref) => (_jsx(DualListSelectorListBase, Object.assign({ innerRef: ref }, props))));
DualListSelectorList.displayName = 'DualListSelectorList';
//# sourceMappingURL=DualListSelectorList.js.map