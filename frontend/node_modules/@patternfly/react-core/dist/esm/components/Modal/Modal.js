import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Component } from 'react';
import * as ReactDOM from 'react-dom';
import { canUseDOM, KeyTypes } from '../../helpers';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Backdrop/backdrop.mjs';
import { ModalContent } from './ModalContent';
import { getDefaultOUIAId } from '../../helpers';
export var ModalVariant;
(function (ModalVariant) {
    ModalVariant["small"] = "small";
    ModalVariant["medium"] = "medium";
    ModalVariant["large"] = "large";
    ModalVariant["default"] = "default";
})(ModalVariant || (ModalVariant = {}));
class Modal extends Component {
    constructor(props) {
        super(props);
        this.boxId = '';
        this.backdropId = '';
        this.handleEscKeyClick = (event) => {
            var _a, _b;
            const { onEscapePress } = this.props;
            if (event.key === KeyTypes.Escape && this.props.isOpen) {
                onEscapePress ? onEscapePress(event) : (_b = (_a = this.props).onClose) === null || _b === void 0 ? void 0 : _b.call(_a, event);
            }
        };
        this.getElement = (appendTo) => {
            if (typeof appendTo === 'function') {
                return appendTo();
            }
            return appendTo || document.body;
        };
        this.toggleSiblingsFromScreenReaders = (hide) => {
            const { appendTo } = this.props;
            const target = this.getElement(appendTo);
            const bodyChildren = target.children;
            for (const child of Array.from(bodyChildren)) {
                if (child.id !== this.backdropId) {
                    hide ? child.setAttribute('aria-hidden', '' + hide) : child.removeAttribute('aria-hidden');
                }
            }
        };
        this.isEmpty = (value) => value === null || value === undefined || value === '';
        const boxIdNum = Modal.currentId++;
        const backdropId = boxIdNum + 1;
        this.boxId = props.id || `pf-modal-part-${boxIdNum}`;
        this.backdropId = `pf-modal-part-${backdropId}`;
        this.state = {
            ouiaStateId: getDefaultOUIAId(Modal.displayName, props.variant)
        };
    }
    componentDidMount() {
        const { appendTo } = this.props;
        const target = this.getElement(appendTo);
        target.addEventListener('keydown', this.handleEscKeyClick, false);
        if (this.props.isOpen) {
            target.classList.add(css(styles.backdropOpen));
            this.toggleSiblingsFromScreenReaders(true);
        }
    }
    componentDidUpdate(prevProps) {
        const { appendTo } = this.props;
        const target = this.getElement(appendTo);
        if (this.props.isOpen) {
            target.classList.add(css(styles.backdropOpen));
            this.toggleSiblingsFromScreenReaders(true);
        }
        else {
            if (prevProps.isOpen !== this.props.isOpen) {
                target.classList.remove(css(styles.backdropOpen));
                this.toggleSiblingsFromScreenReaders(false);
            }
        }
    }
    componentWillUnmount() {
        const { appendTo } = this.props;
        const target = this.getElement(appendTo);
        target.removeEventListener('keydown', this.handleEscKeyClick, false);
        target.classList.remove(css(styles.backdropOpen));
        this.toggleSiblingsFromScreenReaders(false);
    }
    render() {
        const _a = this.props, { appendTo, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onEscapePress, 'aria-labelledby': ariaLabelledby, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedby, ouiaId, ouiaSafe, position, elementToFocus } = _a, props = __rest(_a, ["appendTo", "onEscapePress", 'aria-labelledby', 'aria-label', 'aria-describedby', "ouiaId", "ouiaSafe", "position", "elementToFocus"]);
        if (!canUseDOM || !this.getElement(appendTo)) {
            return null;
        }
        return ReactDOM.createPortal(_jsx(ModalContent, Object.assign({ boxId: this.boxId, backdropId: this.backdropId, "aria-label": ariaLabel, "aria-describedby": ariaDescribedby, "aria-labelledby": ariaLabelledby, ouiaId: ouiaId !== undefined ? ouiaId : this.state.ouiaStateId, ouiaSafe: ouiaSafe, position: position, elementToFocus: elementToFocus, backdropClassName: props.backdropClassName }, props)), this.getElement(appendTo));
    }
}
Modal.displayName = 'Modal';
Modal.currentId = 0;
Modal.defaultProps = {
    isOpen: false,
    variant: 'default',
    appendTo: () => document.body,
    ouiaSafe: true,
    position: 'default'
};
export { Modal };
//# sourceMappingURL=Modal.js.map