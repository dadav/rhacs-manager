import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useContext, useEffect, useRef, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { css } from '@patternfly/react-styles';
import { getUniqueId, handleArrows } from '../../helpers';
import { DualListSelectorList } from './DualListSelectorList';
import { DualListSelectorContext, DualListSelectorListContext } from './DualListSelectorContext';
export const DualListSelectorListWrapperBase = (_a) => {
    var { className, children, 'aria-labelledby': ariaLabelledBy, innerRef, options = [], selectedOptions = [], displayOption, id = getUniqueId('dual-list-selector-list'), isDisabled = false } = _a, props = __rest(_a, ["className", "children", 'aria-labelledby', "innerRef", "options", "selectedOptions", "displayOption", "id", "isDisabled"]);
    const [focusedOption, setFocusedOption] = useState('');
    const ref = useRef(null);
    const menuRef = innerRef || ref;
    const { isTree } = useContext(DualListSelectorContext);
    // Sets up keyboard focus handling for the dual list selector menu child of the pane.
    const handleKeys = (event) => {
        if (!menuRef.current ||
            (menuRef.current !== event.target.closest(`.${styles.dualListSelectorMenu}`) &&
                !Array.from(menuRef.current.getElementsByClassName(styles.dualListSelectorMenu)).includes(event.target.closest(`.${styles.dualListSelectorMenu}`)))) {
            return;
        }
        event.stopImmediatePropagation();
        const validOptions = isTree
            ? Array.from(menuRef.current.querySelectorAll(`.${styles.dualListSelectorItemToggle}, .${styles.dualListSelectorItemCheck} > input`)).filter((item) => !item.closest(`.${styles.dualListSelectorList}[inert]`))
            : Array.from(menuRef.current.getElementsByTagName('LI')).filter((el) => !el.classList.contains('pf-m-disabled'));
        const activeElement = document.activeElement;
        handleArrows(event, validOptions, (element) => activeElement.contains(element), (element) => {
            if (element.classList.contains(`.${styles.dualListSelectorListItem}`)) {
                setFocusedOption(element.id);
            }
            else {
                setFocusedOption(element.closest(`.${styles.dualListSelectorListItem}`).id);
            }
            return element;
        }, [`.${styles.dualListSelectorItemToggle}`, `.${styles.dualListSelectorItemCheck} > input`], undefined, false, false, false);
    };
    useEffect(() => {
        window.addEventListener('keydown', handleKeys);
        return () => {
            window.removeEventListener('keydown', handleKeys);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menuRef.current]);
    return (_jsx("div", Object.assign({ className: css(styles.dualListSelectorMenu, className), ref: menuRef, tabIndex: 0 }, props, { children: _jsx(DualListSelectorListContext.Provider, { value: {
                setFocusedOption,
                isTree,
                focusedOption,
                ariaLabelledBy,
                displayOption,
                selectedOptions,
                id,
                options,
                isDisabled
            }, children: children ? children : _jsx(DualListSelectorList, {}) }) })));
};
DualListSelectorListWrapperBase.displayName = 'DualListSelectorListWrapperBase';
export const DualListSelectorListWrapper = forwardRef((props, ref) => (_jsx(DualListSelectorListWrapperBase, Object.assign({ innerRef: ref }, props))));
DualListSelectorListWrapper.displayName = 'DualListSelectorListWrapper';
//# sourceMappingURL=DualListSelectorListWrapper.js.map