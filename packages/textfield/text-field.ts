import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Directive,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

import {
  Platform,
  toBoolean,
  toNumber
} from '@angular-mdc/web/common';
import { MdcRipple } from '@angular-mdc/web/ripple';
import { MdcFloatingLabel } from '@angular-mdc/web/floating-label';
import { MdcLineRipple } from '@angular-mdc/web/line-ripple';
import { MdcNotchedOutline } from '@angular-mdc/web/notched-outline';

import { MdcTextFieldIcon } from './text-field-icon';
import { MdcTextFieldHelperText } from './helper-text';

import { MDCTextFieldAdapter } from '@material/textfield/adapter';
import { MDCTextFieldFoundation } from '@material/textfield';

export const MDC_TEXTFIELD_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MdcTextField),
  multi: true
};

let nextUniqueId = 0;

@Component({
  moduleId: module.id,
  selector: 'mdc-text-field',
  exportAs: 'mdcTextField',
  host: {
    'class': 'mdc-text-field',
    '[class.mdc-text-field--outlined]': 'outlined',
    '[class.mdc-text-field--dense]': 'dense',
    '[class.mdc-text-field--fullwidth]': 'fullwidth',
    '[class.mdc-text-field--with-leading-icon]': 'leadingIcon',
    '[class.mdc-text-field--with-trailing-icon]': 'trailingIcon'
  },
  template: `
  <ng-content *ngIf="leadingIcon"></ng-content>
  <input #input class="mdc-text-field__input"
    [id]="id"
    [type]="type"
    [tabindex]="tabIndex"
    [disabled]="disabled"
    [attr.pattern]="pattern ? pattern : null"
    [attr.placeholder]="placeholder"
    [attr.maxlength]="maxlength"
    [attr.minlength]="minlength"
    [attr.max]="max"
    [attr.min]="min"
    [attr.size]="size"
    [attr.step]="step"
    [required]="required"
    (blur)="onBlur()"
    (input)="onInput($event.target.value)" />
    <ng-content></ng-content>
    <label mdcFloatingLabel [attr.for]="id" *ngIf="!placeholder">{{label}}</label>
    <mdc-line-ripple *ngIf="!outlined"></mdc-line-ripple>
    <mdc-notched-outline *ngIf="outlined"></mdc-notched-outline>
  `,
  providers: [
    MDC_TEXTFIELD_CONTROL_VALUE_ACCESSOR,
    MdcRipple
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MdcTextField implements AfterViewInit, OnDestroy, ControlValueAccessor {
  private _uid = `mdc-input-${nextUniqueId++}`;

  @Input() label: string;
  @Input() maxlength: number;
  @Input() minlength: number;
  @Input() pattern: string;
  @Input() max: number;
  @Input() min: number;
  @Input() size: number;
  @Input() step: number;
  @Input() placeholder: string;
  @Input() tabIndex: number = 0;

  @Input()
  get id(): string { return this._id; }
  set id(value: string) { this._id = value || this._uid; }
  private _id: string;

  /** Input type of the element. */
  @Input()
  get type(): string { return this._type; }
  set type(value: string) {
    this._type = value || 'text';
  }
  private _type = 'text';

  @Input()
  get outlined(): boolean { return this._outlined; }
  set outlined(value: boolean) {
    this.setOutlined(value);
  }
  private _outlined: boolean;

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value: boolean) {
    this.setDisabled(value);
  }
  private _disabled: boolean;

  @Input()
  get required(): boolean { return this._required; }
  set required(value: boolean) {
    this._required = toBoolean(value);
    this._changeDetectorRef.markForCheck();
  }
  private _required: boolean;

  @Input()
  get fullwidth(): boolean { return this._fullwidth; }
  set fullwidth(value: boolean) {
    this.setFullwidth(value);
  }
  private _fullwidth: boolean;

  @Input()
  get dense(): boolean { return this._dense; }
  set dense(value: boolean) {
    this.setDense(value);
  }
  private _dense: boolean;

  @Input()
  get helperText(): MdcTextFieldHelperText { return this._helperText; }
  set helperText(helperText: MdcTextFieldHelperText) {
    this.setHelperText(helperText);
  }
  private _helperText: MdcTextFieldHelperText;

  /** Enables or disables the use of native validation. Use this for custom validation. */
  @Input()
  get useNativeValidation(): boolean { return this._useNativeValidation; }
  set useNativeValidation(value: boolean) {
    this._useNativeValidation = toBoolean(value);
    this._foundation.setUseNativeValidation(this._useNativeValidation);
  }
  private _useNativeValidation: boolean = true;


  /** The input element's value. */
  @Input()
  get value(): any { return this._value; }
  set value(newValue: any) {
    if (this._value !== newValue) {
      this.setValue(newValue);
    }
  }
  private _value: string;

  /** Sets the Text Field valid or invalid. */
  @Input()
  get valid(): boolean { return this._foundation.isValid(); }
  set valid(value: boolean) {
    this._valid = toBoolean(value);
    this._foundation.setValid(this._valid);
  }
  private _valid: boolean;

  @Output() readonly change = new EventEmitter<string>();
  @Output() readonly blur = new EventEmitter<string>();

  @ViewChild('input') _input: ElementRef;
  @ViewChild(MdcFloatingLabel) _floatingLabel: MdcFloatingLabel;
  @ViewChild(MdcLineRipple) _lineRipple: MdcLineRipple;
  @ViewChild(MdcNotchedOutline) _notchedOutline: MdcNotchedOutline;
  @ContentChildren(MdcTextFieldIcon, { descendants: true }) _icons: QueryList<MdcTextFieldIcon>;

  /** Whether the control is empty. */
  get empty(): boolean {
    return !this._getInputElement().value && !this.isBadInput();
  }

  get focused(): boolean {
    return this._platform.isBrowser ? document.activeElement === this._getInputElement() : false;
  }

  /** Determines if the component host is a textarea. */
  readonly textarea: boolean = this._getHostElement().nodeName.toLowerCase() === 'mdc-textarea';

  private _mdcAdapter: MDCTextFieldAdapter = {
    addClass: (className: string) => this._getHostElement().classList.add(className),
    removeClass: (className: string) => this._getHostElement().classList.remove(className),
    hasClass: (className: string) => this._getHostElement().classList.contains(className),
    registerTextFieldInteractionHandler: (evtType: string, handler: EventListener) =>
      this._getHostElement().addEventListener(evtType, handler),
    deregisterTextFieldInteractionHandler: (evtType: string, handler: EventListener) =>
      this._getHostElement().removeEventListener(evtType, handler),
    registerInputInteractionHandler: (evtType: string, handler: EventListener) =>
      this._getInputElement().addEventListener(evtType, handler),
    deregisterInputInteractionHandler: (evtType: string, handler: EventListener) =>
      this._getInputElement().removeEventListener(evtType, handler),
    isFocused: () => {
      if (!this._platform.isBrowser) { return false; }
      return document.activeElement === this._getInputElement();
    },
    isRtl: () => this._platform.isBrowser ?
      window.getComputedStyle(this._getHostElement()).getPropertyValue('direction') === 'rtl' : false,
    activateLineRipple: () => {
      if (this._lineRipple) {
        this._lineRipple.activate();
      }
    },
    deactivateLineRipple: () => {
      if (this._lineRipple) {
        this._lineRipple.deactivate();
      }
    },
    setLineRippleTransformOrigin: (normalizedX: number) => {
      if (this._lineRipple) {
        this._lineRipple.setRippleCenter(normalizedX);
      }
    },
    shakeLabel: (shouldShake: boolean) => this._floatingLabel.shake(shouldShake),
    floatLabel: (shouldFloat: boolean) => this._floatingLabel.float(shouldFloat),
    hasLabel: () => this._floatingLabel,
    getLabelWidth: () => this._floatingLabel ? this._floatingLabel.getWidth() : 0,
    hasOutline: () => this._notchedOutline,
    notchOutline: (labelWidth: number, isRtl: boolean) => this._notchedOutline.notch(labelWidth, isRtl),
    closeOutline: () => this._notchedOutline.closeNotch(),
    registerValidationAttributeChangeHandler: (handler: (whitelist: Array<string>) => void) => {
      const getAttributesList = (mutationsList) => mutationsList.map((mutation) => mutation.attributeName);
      const observer = new MutationObserver((mutationsList) => handler(getAttributesList(mutationsList)));
      observer.observe(this._getInputElement(), { attributes: true });
      return observer;
    },
    deregisterValidationAttributeChangeHandler: (observer: MutationObserver) => {
      if (observer) {
        observer.disconnect();
      }
    },
    getNativeInput: () => this._getInputElement(),
    helperText: this._helperText ? this.helperText.helperTextFoundation : undefined,
    icon: this._icons ? this._icons.first.iconTextFoundation : undefined
  };

  private _foundation: {
    init(): void,
    destroy(): void,
    isDisabled(): boolean,
    setDisabled(disabled: boolean): void,
    setValid(isValid: boolean): void,
    setValue(value: any): void,
    isValid(): boolean,
    notchOutline(openNotch: boolean): void,
    setUseNativeValidation(useNativeValidation: boolean): void
  } = new MDCTextFieldFoundation(this._mdcAdapter);

  /** View -> model callback called when value changes */
  _onChange: (value: any) => void = () => { };

  /** View -> model callback called when text field has been touched */
  _onTouched = () => { };

  constructor(
    private _platform: Platform,
    private _changeDetectorRef: ChangeDetectorRef,
    public elementRef: ElementRef<HTMLElement>,
    private _ripple: MdcRipple) {

    // Force setter to be called in case id was not specified.
    this.id = this.id;
  }

  ngAfterViewInit(): void {
    this._foundation = new MDCTextFieldFoundation(this._mdcAdapter);
    this._foundation.init();

    this._initRipple();
  }

  ngOnDestroy(): void {
    this._ripple.destroy();
    this._foundation.destroy();
  }

  writeValue(value: any): void {
    this.setValue(value == null ? '' : value, false);
  }

  registerOnChange(fn: (value: any) => any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => any): void {
    this._onTouched = fn;
  }

  onInput(value: any): void {
    this.setValue(value);
  }

  onBlur(): void {
    this._onTouched();
    this.blur.emit(this.value);

    this._changeDetectorRef.markForCheck();
  }

  setValue(value: any, isUserInput: boolean = true): void {
    this._value = this.type === 'number' ?
      (value === '' ? null : toNumber(value)) : value;

    setTimeout(() => {
      this._foundation.setValue(this._value);

      if (isUserInput) {
        this._onChange(this._value);
      }

      if (this.required && !this._value) {
        this.required = false;
        setTimeout(() => this.required = true);
      }
    }, 0);

    this._changeDetectorRef.markForCheck();
  }

  isBadInput(): boolean {
    const validity = this._getInputElement().validity;
    return validity && validity.badInput;
  }

  focus(): void {
    if (!this.disabled) {
      this._getInputElement().focus();
    }
  }

  /** Styles the text field as an outlined text field. */
  setOutlined(outlined: boolean): void {
    this._outlined = toBoolean(outlined);

    if (this.outlined && this.value) {
      setTimeout(() => {
        this._foundation.notchOutline(this.value);
      });
    }

    this._initRipple();

    this._changeDetectorRef.markForCheck();
  }

  /** Styles the text field as a fullwidth text field. */
  setFullwidth(fullwidth: boolean): void {
    this._fullwidth = toBoolean(fullwidth);
    this.placeholder = this.fullwidth ? this.label : '';

    this._changeDetectorRef.markForCheck();
  }

  setDense(dense: boolean): void {
    this._dense = toBoolean(dense);
    this._changeDetectorRef.markForCheck();
  }

  setDisabled(disabled: boolean): void {
    this.setDisabledState(disabled);
  }

  setHelperText(helperText: MdcTextFieldHelperText): void {
    this._helperText = helperText;
    this._changeDetectorRef.markForCheck();
  }

  selectAll(): void {
    this._getInputElement().select();
  }

  get leadingIcon(): MdcTextFieldIcon | undefined {
    return this._icons.find((icon: MdcTextFieldIcon) => icon.leading);
  }

  get trailingIcon(): MdcTextFieldIcon | undefined {
    return this._icons.find((icon: MdcTextFieldIcon) => icon.trailing);
  }

  // Implemented as part of ControlValueAccessor.
  setDisabledState(isDisabled: boolean) {
    this._disabled = toBoolean(isDisabled);
    setTimeout(() => this._foundation.setDisabled(this.disabled));
    this._changeDetectorRef.markForCheck();
  }

  private _initRipple(): void {
    if (!this._getInputElement()) { return; }

    if (!this._ripple.attached && !this.outlined && !this.textarea) {
      this._ripple.attachTo(this._getHostElement(), false, this._getInputElement());
    } else {
      this._ripple.destroy();
    }
  }

  private _getInputElement(): HTMLInputElement {
    return this._input.nativeElement;
  }

  /** Retrieves the DOM element of the component host. */
  private _getHostElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }
}