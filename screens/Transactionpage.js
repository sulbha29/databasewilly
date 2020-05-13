import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Image, StyleSheet, Alert,KeyboardAvoidingView,ToastAndroid } from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import  firebase from 'firebase'
import db from '../config'

export default class TransactionScreen extends React.Component {
    constructor(){
      super();
      this.state = {
        hasCameraPermissions: null,
        scanned: false,
        scannedBookId: '',
        scannedStudentId:'',
        buttonState: 'normal',
        transactionMessage:'',
      }
    }

    getCameraPermissions = async (id) =>{
      const {status} = await Permissions.askAsync(Permissions.CAMERA);
      
      this.setState({
        /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
        hasCameraPermissions: status === "granted",
        buttonState: id,
        scanned: false
      });
    }

    handleBarCodeScanned = async({type, data})=>{
      const {buttonState} = this.state

      if(buttonState==="bookid"){
        this.setState({
          scanned: true,
          scannedBookId: data,
          buttonState: 'normal'
        });
      }
      else if(buttonState==="studentId"){
        this.setState({
          scanned: true,
          scannedStudentId: data,
          buttonState: 'normal'
        });
      }
      
    }
    
inititiateBookIssue= async()=>{
    db.collection("transaction").add({
        'studentId':this.state.scannedStudentId,
        'bookid':this.state.scannedBookId,
        'date':firebase.firestore.Timestamp.now().toDate(),
        'transactionType':"Issue",
    })
    db.collection("books").doc(this.state.scannedBookId).update({
        'bookavailability':false
    })
    db.collection("students").doc(this.state.scannedStudentId).update({
        'numberofbooksissued':firebase.firestore.FieldValue.increment(1)
    })
   
}
initiateBookReturn = async()=>{
    db.collection("transaction").add({
        'studentId':this.state.scannedStudentId,
        'bookid':this.state.scannedBookId,
        'date':firebase.firestore.Timestamp.now().toDate(),
        'transactionType':"Return"
    })
    db.collection("books").doc(this.state.scannedBookId).update({
        'bookavailablility':true
    })
    db.collection("students").doc(this.state.scannedStudentId).update({
        'numberofbooksissued':firebase.firestore.FieldValue.increment(-1)
    })
    
}
checkStudentEligibilityForBookIssue=async()=>{
  console.log(this.state.scannedStudentId);
  const studentref = await db.collection("students").where("studentId","==",this.state.scannedStudentId).get()
  
  var isStudentEligible=""
  if(studentref.docs.length == 0){
    this.setState({
      scannedStudentId:'',
      scannedBookId:'',
    })
    isStudentEligible=false;
    Alert.alert("studentId doesnt exist in database");
  }
  else{
    studentref.docs.map((doc)=>{
      var student = doc.data();
      if(student.numberofbooksissued <2){
isStudentEligible=true;
      }
      else{
        isStudentEligible=false;
        Alert.alert("student has already issued two books");
        this.setState({
          scannedStudentId:'',
          scannedBookId:'',
        })
      }
    })
  }
  return isStudentEligible;
}
checkStudentEligibilityforReturn=async()=>{
  const transactionref = await db.collection("transaction").where("bookid","==",this.state.scannedBookId).limit(1).get();
  var isStudentEligible="";
  transactionref.docs.map((doc)=>{
    var lastbooktransaction = doc.data();
    if(lastbooktransaction.studentId===this.state.scannedStudentId){
      isStudentEligible= true;
    }
    else{
      isStudentEligible=false;
      Alert.alert("The book was not issued by this student");
      this.setStaet({
        scannedBookId:'',
        scannedStudentId:'',
      })
    }
  })
  return isStudentEligible;
}
checkbookeligibility=async()=>{
  const bookref = await db.collection("books").where("bookid","==",this.state.scannedBookId).get();
  var transactionType = ""
  if(bookref.docs.length ==0){
    transactionType=false;
  }
  else{
bookref.docs.map((doc)=>{
  var book = doc.data();
  if(book.bookavailability){
    transactionType= "Issued";
  }
  else{
    transactionType="Return"
  }
})
}
return transactionType
}
handleTransaction=async()=>{
  var transactionType = await this.checkbookeligibility();
  if(!transactionType){
    Alert.alert("the book doesnt exist in library databse");
    this.setState({
      scannedStudentId:'',
      scannedBookId:'',
    })
  } 
  else if(transactionType === "Issue"){
    var isStudentEligible = await this.checkStudentEligibilityForBookIssue()
    if(isStudentEligible){
      this.initiateBookIssue()
      Alert.alert("Book issued to the student!")
    }
  }
  else{
    var isStudentEligible = await this.checkStudentEligibilityforReturn();
    if(isStudentEligible){
      this.initiateBookReturn();
      Alert.alert("Book returned to library");
    }
  }
  }
      
      
      
    render() {
      const hasCameraPermissions = this.state.hasCameraPermissions;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if (buttonState !== "normal" && hasCameraPermissions){
        return(
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        );
      }

      else if (buttonState === "normal"){

        return(
          <KeyboardAvoidingView style ={styles.container} behaviour ="padding" enabled>
         
            <View>
              <Image
                source={require("../assets/booklogo.jpg")}
                style={{width:200, height: 200}}/>
              <Text style={{textAlign: 'center', fontSize: 30}}>Wily</Text>
            </View>
            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Book Id"
              onChangeText={text=>this.setState({scannedBookId:text})}
              value={this.state.scannedBookId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("bookid")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>
            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Student Id"
              onChangeText={text=>this.setState({scannedStudentId:text})}
              value={this.state.scannedStudentId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("studentId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>
            <TouchableOpacity
            style={styles.submitButton}
            onPress={async()=>{
              var transactionMessage = this.handleTransaction();
              this.setState(
                {scannedBookId:'',
                 scannedStudentId:''})
            }}>
                <Text style = {styles.submitButtonText}>Submit</Text></TouchableOpacity>
        
          </KeyboardAvoidingView>
        );
      }
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    displayText:{
      fontSize: 15,
      textDecorationLine: 'underline'
    },
    scanButton:{
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10
    },
    buttonText:{
      fontSize: 15,
      textAlign: 'center',
      marginTop: 10
    },
    inputView:{
      flexDirection: 'row',
      margin: 20
    },
    inputBox:{
      width: 200,
      height: 40,
      borderWidth: 1.5,
      borderRightWidth: 0,
      fontSize: 20
    },
    scanButton:{
      backgroundColor: '#66BB6A',
      width: 50,
      borderWidth: 1.5,
      borderLeftWidth: 0
    },
    submitButton:{
        backgroundColor:'#FBC02D',
        width:100,
        height:50,
    },
    submitButtonText:{
padding:10,
textAlign:'center',
fontSize:20,
fontWeight:"bold",
color:'white',
    }
  });