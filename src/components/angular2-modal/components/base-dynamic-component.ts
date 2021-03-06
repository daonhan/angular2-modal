import { 
  ComponentRef,
  ComponentFactoryResolver,
  ElementRef,
  ResolvedReflectiveProvider,
  OnDestroy,
  ViewContainerRef,
  Renderer
} from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { createComponent } from '../framework/createComponent';

const BROWSER_PREFIX = ['webkit', 'moz', 'MS', 'o', ''];

function register(eventName, element, cb) {
  BROWSER_PREFIX.forEach( p => {
    element.addEventListener(p ? p + eventName : eventName.toLowerCase(), cb, false);
  });
}

/**
 * A base class for supporting dynamic components.
 * There are 3 main support areas:
 * 1 - Easy wrapper for dynamic styling via CSS classes and inline styles.
 * 2 - Easy wrapper for interception of transition/animation end events.
 * 3 - Easy wrapper for component creation and injection.
 *
 * Dynamic css is done via direct element manipulation (via renderer), it does not use change detection
 * or binding. This is to allow better control over animation.
 *
 * Animation support is limited, only transition/keyframes END even are notified.
 * The animation support is needed since currently the angular animation module is limited as well and
 * does not support CSS animation that are not pre-parsed and are not in the styles metadata of a component.
 *
 * Capabilities: Add/Remove styls, Add/Remove classes, listen to animation/transition end event,
 * add components
 */
export class BaseDynamicComponent implements OnDestroy {
  animationEnd$: Observable<'transition' | 'animation'>;

  protected animationEnd: Subject<'transition' | 'animation'>;

  constructor(protected el: ElementRef,
              protected renderer: Renderer) {}
  
  activateAnimationListener() {
    if (this.animationEnd) return;
    this.animationEnd = new Subject<'transition' | 'animation'>();
    this.animationEnd$ = this.animationEnd.asObservable();
    register('TransitionEnd', this.el.nativeElement, this.onEndTransition.bind(this));
    register('AnimationEnd', this.el.nativeElement, this.onEndAnimation.bind(this));
  }
  /**
   * Set a specific inline style on the overlay host element.
   * @param prop The style key
   * @param value The value, undefined to remove
   * @returns {ModalOverlay}
   */
  setStyle(prop: string, value: string): this {
    this.renderer.setElementStyle(this.el.nativeElement, prop, value);
    return this;
  }

  forceReflow() {
    this.el.nativeElement.offsetWidth;
  }

  addClass(css: string, forceReflow: boolean = false): void {
    css.split(' ')
      .forEach( c => this.renderer.setElementClass(this.el.nativeElement, c, true) );
    if (forceReflow) this.forceReflow();
  }

  removeClass(css: string, forceReflow: boolean = false): void {
    css.split(' ')
      .forEach( c => this.renderer.setElementClass(this.el.nativeElement, c, false) );
    if (forceReflow) this.forceReflow();
  }

  ngOnDestroy(): void {
    if (this.animationEnd && !this.animationEnd.isUnsubscribed) {
      this.animationEnd.complete();
    }
  }

  /**
   * Add a component, supply a view container ref.
   * Note: The components vcRef will result in a sibling.
   * @param type The component to add
   * @param vcRef The container to add to
   * @param bindings Bindings to use (added on top of the ViewContainerRef)
   * @returns {Promise<ComponentRef<any>>}
   */
  protected _addComponent<T>(type: any,
                             vcRef: ViewContainerRef,
                             bindings?: ResolvedReflectiveProvider[]): ComponentRef<T> {
    const cmpRef =
      createComponent(vcRef.injector.get(ComponentFactoryResolver), type, vcRef, bindings || []);

    cmpRef.changeDetectorRef.detectChanges();

    return cmpRef;
  }

  private onEndTransition() {
    if (!this.animationEnd.isUnsubscribed) {
      this.animationEnd.next('transition');
    }

  }

  private onEndAnimation() {
    if (!this.animationEnd.isUnsubscribed) {
      this.animationEnd.next('animation');
    }
  }

}
