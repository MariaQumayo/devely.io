import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs/Subject';

import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { 
    CognitoUserPool, 
    CognitoUserAttribute, 
    CognitoUser,
    AuthenticationDetails,
    CognitoUserSession
  } from 'amazon-cognito-identity-js';

import { User } from './user.model';

//connectiong to Cognito
const POOL_DATA = {
  UserPoolId: 'us-west-2_P3ZT08tDJ',
  ClientId: '2quk2lht1j75992m1n3koa65f8'
}
//create a new user pool
const userPool = new CognitoUserPool(POOL_DATA);

@Injectable()
export class AuthService {
  authIsLoading = new BehaviorSubject<boolean>(false);
  authDidFail = new BehaviorSubject<boolean>(false);
  authStatusChanged = new Subject<boolean>();
  registerdUser: CognitoUser;

  constructor(private router: Router) {}
  signUp(username: string, email: string, password: string): void {
    this.authIsLoading.next(true);
    const user: User = {
      username: username,
      email: email,
      password: password
    };
    const attrList: CognitoUserAttribute[] = [];
    const emailAttribute = {
      Name: 'email',
      Value: user.email
    };
    attrList.push(new CognitoUserAttribute(emailAttribute));
    userPool.signUp(user.username, user.password, attrList,null, (err, result) =>{
      if(err){
        this.authDidFail.next(true);
        this.authIsLoading.next(false);
        console.log('I FAILI BECAUSE', err);
        return;
      }
      this.authDidFail.next(false);
      this.authIsLoading.next(false);
      this.registerdUser = result.user; 
      console.log('REGISTERED PASS!');
    });
    return;
  }
  confirmUser(username: string, code: string) {
    this.authIsLoading.next(true);
    const userData = {
      Username: username,
      Pool: userPool
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code,true, (err, result) =>{
      if(err){
        this.authDidFail.next(true);
        this.authIsLoading.next(false);
        console.log('I FAILI BECAUSE', err);
        return;
      }
      this.authDidFail.next(false);
      this.authIsLoading.next(false);
      this.router.navigate(['/']);
    });
  }
  signIn(username: string, password: string): void {
    this.authIsLoading.next(true);
    const authData = {
      Username: username,
      Password: password
    };
    const authDetails = new AuthenticationDetails(authData);
    const userData = {
      Username: username,
      Pool: userPool
    };
    const cognitoUser = new CognitoUser(userData);
    //declare that
    const that = this;
    cognitoUser.authenticateUser(authDetails, {
      onSuccess(result: CognitoUserSession){
        that.authStatusChanged.next(true);
        that.authIsLoading.next(false);
        that.authDidFail.next(false);
        console.log(result);
      },
      onFailure(err){
        that.authDidFail.next(true);
        that.authIsLoading.next(false);
        console.log(err);
      }
    });
    this.authStatusChanged.next(true);
    return;
  }
  //get user data that is logged in.
  getAuthenticatedUser() {
    return userPool.getCurrentUser();
  }
  //log out
  logout() {
    this.getAuthenticatedUser().signOut();
    this.authStatusChanged.next(false);
  }

  isAuthenticated(): Observable<boolean> {
    const user = this.getAuthenticatedUser();
    const obs = Observable.create((observer) => {
      if (!user) {
        observer.next(false);
      } else {
        user.getSession((err,session) =>{
          if(err){
            observer.next(false);
          }else{
            if(session.isValid()){
              observer.next(true);
            }else{
              observer.next(false);
            }
          }
        });
      }
      observer.complete();
    });
    return obs;
  }
  initAuth() {
    this.isAuthenticated().subscribe(
      (auth) => this.authStatusChanged.next(auth)
    );
  }
}
