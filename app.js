// app.js 파일의 맨 위



let allWords = [];



// words.json 파일에서 데이터를 불러오는 함수

fetch('words.json')

    .then(response => response.json())

    .then(data => {

        allWords = data;

        console.log("단어 데이터 로드 완료!", allWords.length, "개");

        // 데이터가 다 불러와진 후에 시작 버튼을 누를 수 있도록 설정하면 좋습니다.

    })

    .catch(error => console.error("데이터를 불러오는 중 에러 발생:", error));



// 아래부터는 앞서 알려드린 함수들을 쭉 적으시면 됩니다.

function shuffleArray(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];

    }

    return array;

}

function startQuiz(selectedLevel, questionCount) {

    // 선택한 난이도에 맞는 단어만 필터링

    let filteredWords = allWords.filter(word => word.level === selectedLevel);


    // 필터링된 배열의 순서를 섞고, 앞에서부터 questionCount만큼 자름

    let currentQuizWords = shuffleArray([...filteredWords]).slice(0, questionCount);


    // 이제 currentQuizWords 배열(예: 5개의 단어)을 가지고 1번 문제부터 화면에 렌더링한다.

    // renderQuestion(currentQuizWords, 0);

}

// 마지막 글자의 받침 유무 확인 함수

function hasBatchim(word) {

    const lastChar = word.charCodeAt(word.length - 1);

    if (lastChar >= 0xAC00 && lastChar <= 0xD7A3) {

        return (lastChar - 0xAC00) % 28 > 0; // 나머지가 있으면 받침 존재

    }

    return false;

}



// 정답 확인 및 조사 교정 로직 예시

function displayCorrectSentence(userAnswer, originalSentence) {

    // 퀴즈 데이터의 sentence 구조가 "____이(가) ..." 형태라고 가정할 때의 처리 로직

    // 실제로는 문맥에 남아있는 조사를 파악해 치환하는 정규식이 필요할 수 있다.

    let nextParticle = "이"; // 원본 문장에 있던 조사 예시

    let correctedParticle = nextParticle;



    if (hasBatchim(userAnswer)) {

        // 받침이 있으면: 이, 은, 을, 과

        if (nextParticle === "가") correctedParticle = "이";

        if (nextParticle === "는") correctedParticle = "은";

        if (nextParticle === "를") correctedParticle = "을";

    } else {

        // 받침이 없으면: 가, 는, 를, 와

        if (nextParticle === "이") correctedParticle = "가";

        if (nextParticle === "은") correctedParticle = "는";

        if (nextParticle === "을") correctedParticle = "를";

    }



    // 원본 문장의 빈칸과 조사를 유저의 답안과 교정된 조사로 교체

    let finalSentence = originalSentence.replace("____" + nextParticle, `<span class="highlight">${userAnswer}</span>${correctedParticle}`);


    return finalSentence;

}