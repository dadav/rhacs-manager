"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = exports.ModalVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ReactDOM = tslib_1.__importStar(require("react-dom"));
const helpers_1 = require("../../../helpers");
const react_styles_1 = require("@patternfly/react-styles");
const backdrop_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Backdrop/backdrop"));
const ModalContent_1 = require("./ModalContent");
const helpers_2 = require("../../../helpers");
var ModalVariant;
(function (ModalVariant) {
    ModalVariant["small"] = "small";
    ModalVariant["medium"] = "medium";
    ModalVariant["large"] = "large";
    ModalVariant["default"] = "default";
})(ModalVariant || (exports.ModalVariant = ModalVariant = {}));
class Modal extends react_1.Component {
    constructor(props) {
        super(props);
        this.boxId = '';
        this.labelId = '';
        this.descriptorId = '';
        this.backdropId = '';
        this.handleEscKeyClick = (event) => {
            var _a, _b;
            const { onEscapePress } = this.props;
            if (event.key === helpers_1.KeyTypes.Escape && this.props.isOpen) {
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
        const labelIdNum = boxIdNum + 1;
        const descriptorIdNum = boxIdNum + 2;
        const backdropIdNum = boxIdNum + 3;
        this.boxId = props.id || `pf-modal-part-${boxIdNum}`;
        this.labelId = `pf-modal-part-${labelIdNum}`;
        this.descriptorId = `pf-modal-part-${descriptorIdNum}`;
        this.backdropId = `pf-modal-part-${backdropIdNum}`;
        this.state = {
            ouiaStateId: (0, helpers_2.getDefaultOUIAId)(Modal.displayName, props.variant)
        };
    }
    componentDidMount() {
        const { appendTo, title, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, hasNoBodyWrapper, header } = this.props;
        const target = this.getElement(appendTo);
        target.addEventListener('keydown', this.handleEscKeyClick, false);
        if (this.props.isOpen) {
            target.classList.add((0, react_styles_1.css)(backdrop_1.default.backdropOpen));
            this.toggleSiblingsFromScreenReaders(true);
        }
        if (!title && this.isEmpty(ariaLabel) && this.isEmpty(ariaLabelledby)) {
            // eslint-disable-next-line no-console
            console.error('Modal: Specify at least one of: title, aria-label, aria-labelledby.');
        }
        if (this.isEmpty(ariaLabel) && this.isEmpty(ariaLabelledby) && (hasNoBodyWrapper || header)) {
            // eslint-disable-next-line no-console
            console.error('Modal: When using hasNoBodyWrapper or setting a custom header, ensure you assign an accessible name to the the modal container with aria-label or aria-labelledby.');
        }
    }
    componentDidUpdate(prevProps) {
        const { appendTo } = this.props;
        const target = this.getElement(appendTo);
        if (this.props.isOpen) {
            target.classList.add((0, react_styles_1.css)(backdrop_1.default.backdropOpen));
            this.toggleSiblingsFromScreenReaders(true);
        }
        else {
            if (prevProps.isOpen !== this.props.isOpen) {
                target.classList.remove((0, react_styles_1.css)(backdrop_1.default.backdropOpen));
                this.toggleSiblingsFromScreenReaders(false);
            }
        }
    }
    componentWillUnmount() {
        const { appendTo } = this.props;
        const target = this.getElement(appendTo);
        target.removeEventListener('keydown', this.handleEscKeyClick, false);
        target.classList.remove((0, react_styles_1.css)(backdrop_1.default.backdropOpen));
        this.toggleSiblingsFromScreenReaders(false);
    }
    render() {
        const _a = this.props, { appendTo, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onEscapePress, 'aria-labelledby': ariaLabelledby, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedby, bodyAriaLabel, bodyAriaRole, title, titleIconVariant, titleLabel, ouiaId, ouiaSafe, position, elementToFocus } = _a, props = tslib_1.__rest(_a, ["appendTo", "onEscapePress", 'aria-labelledby', 'aria-label', 'aria-describedby', "bodyAriaLabel", "bodyAriaRole", "title", "titleIconVariant", "titleLabel", "ouiaId", "ouiaSafe", "position", "elementToFocus"]);
        if (!helpers_1.canUseDOM || !this.getElement(appendTo)) {
            return null;
        }
        return ReactDOM.createPortal((0, jsx_runtime_1.jsx)(ModalContent_1.ModalContent, Object.assign({}, props, { boxId: this.boxId, labelId: this.labelId, descriptorId: this.descriptorId, backdropId: this.backdropId, title: title, titleIconVariant: titleIconVariant, titleLabel: titleLabel, "aria-label": ariaLabel, "aria-describedby": ariaDescribedby, "aria-labelledby": ariaLabelledby, bodyAriaLabel: bodyAriaLabel, bodyAriaRole: bodyAriaRole, ouiaId: ouiaId !== undefined ? ouiaId : this.state.ouiaStateId, ouiaSafe: ouiaSafe, position: position, elementToFocus: elementToFocus })), this.getElement(appendTo));
    }
}
exports.Modal = Modal;
Modal.displayName = 'Modal';
Modal.currentId = 0;
Modal.defaultProps = {
    className: '',
    isOpen: false,
    title: '',
    titleIconVariant: null,
    titleLabel: '',
    'aria-label': '',
    showClose: true,
    'aria-describedby': '',
    'aria-labelledby': '',
    id: undefined,
    actions: [],
    onClose: () => undefined,
    variant: 'default',
    hasNoBodyWrapper: false,
    appendTo: () => document.body,
    ouiaSafe: true,
    position: 'default'
};
//# sourceMappingURL=Modal.js.map