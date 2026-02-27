import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children, Component, createContext } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/SimpleList/simple-list.mjs';
import { SimpleListGroup } from './SimpleListGroup';
export const SimpleListContext = createContext({});
class SimpleList extends Component {
    constructor() {
        super(...arguments);
        this.state = {
            currentRef: null
        };
        this.handleCurrentUpdate = (newCurrentRef, itemProps) => {
            this.setState({ currentRef: newCurrentRef });
            const { onSelect } = this.props;
            onSelect && onSelect(newCurrentRef, itemProps);
        };
    }
    render() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _a = this.props, { children, className, onSelect, isControlled, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["children", "className", "onSelect", "isControlled", 'aria-label']);
        let isGrouped = false;
        if (children) {
            isGrouped = Children.toArray(children)[0].type === SimpleListGroup;
        }
        return (_jsx(SimpleListContext.Provider, { value: {
                currentRef: this.state.currentRef,
                updateCurrentRef: this.handleCurrentUpdate,
                isControlled
            }, children: _jsxs("div", Object.assign({ className: css(styles.simpleList, className) }, props, { children: [isGrouped && children, !isGrouped && (_jsx("ul", { className: css('pf-v6-c-simple-list__list'), role: "list", "aria-label": ariaLabel, children: children }))] })) }));
    }
}
SimpleList.displayName = 'SimpleList';
SimpleList.defaultProps = {
    children: null,
    className: '',
    isControlled: true
};
export { SimpleList };
//# sourceMappingURL=SimpleList.js.map