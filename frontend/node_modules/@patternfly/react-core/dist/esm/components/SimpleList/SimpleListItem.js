import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Component, createRef } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/SimpleList/simple-list.mjs';
import { SimpleListContext } from './SimpleList';
class SimpleListItem extends Component {
    constructor() {
        super(...arguments);
        this.ref = createRef();
    }
    render() {
        const _a = this.props, { children, isActive, className, component: Component, componentClassName, componentProps, onClick, type, href, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        itemId } = _a, props = __rest(_a, ["children", "isActive", "className", "component", "componentClassName", "componentProps", "onClick", "type", "href", "itemId"]);
        return (_jsx(SimpleListContext.Consumer, { children: ({ currentRef, updateCurrentRef, isControlled }) => {
                const isButton = Component === 'button';
                const isCurrentItem = this.ref && currentRef && isControlled ? currentRef.current === this.ref.current : isActive;
                const additionalComponentProps = isButton
                    ? {
                        type
                    }
                    : {
                        tabIndex: 0,
                        href
                    };
                return (_jsx("li", Object.assign({ className: css('pf-v6-c-simple-list__item', className) }, props, { children: _jsx(Component, Object.assign({ className: css(styles.simpleListItemLink, isCurrentItem && styles.modifiers.current, !isButton && styles.modifiers.link, componentClassName), onClick: (evt) => {
                            onClick(evt);
                            updateCurrentRef(this.ref, this.props);
                        }, ref: this.ref }, componentProps, additionalComponentProps, { children: children })) })));
            } }));
    }
}
SimpleListItem.displayName = 'SimpleListItem';
SimpleListItem.defaultProps = {
    children: null,
    className: '',
    isActive: false,
    component: 'button',
    componentClassName: '',
    type: 'button',
    href: '',
    onClick: () => { }
};
export { SimpleListItem };
//# sourceMappingURL=SimpleListItem.js.map