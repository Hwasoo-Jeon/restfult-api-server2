import "./util/dotenvConfig"; //dotenv.config();
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser"; //cookie-parser 미들웨어를 불러옵니다. 이는 요청된 쿠키를 파싱하여 req.cookies로 접근하게 함.
import logger from "morgan"; //morgan 미들웨어를 불러옵니다. HTTP 요청 로거로서, 요청에 대한 정보를 로그로 기록하는 데 사용
// import { fileURLToPath } from "url";
import indexRouter from "./routes/index";
import usersRouter from "./routes/users";
import testRouter from "./routes/test";
import tokenRouter from "./routes/token";
import session from "express-session";
import path from "path";

const app = express();

//logger 설정
logger.token("date", function (req: Request, res: Response) {
  return new Date().toLocaleString();
});

logger.token("access", function (req: Request, res: Response) {
  return req.ip;
});

logger.format(
  "myformat",
  "[ :date ] :access :method :url :status :response-time ms"
);
// COOKIE 파싱 관련 시크릿 변수
const cookieSecret = process.env.COOKIE_SECRET;
(() => {
  if (cookieSecret === undefined) throw new Error("cookieSecret is undefined");
})();
app.use(logger("myformat")); //HTTP 요청 로그를 개발자 친화적 형식으로 출력
app.use(express.json()); //들어오는 요청 본문(body)을 JSON 형식으로 파싱
app.use(express.urlencoded({ extended: true })); //URL 인코딩된 데이터를 파싱합니다. extended: false는 라이브러리 querystring을 사용함(ex form 태그)
app.use(cookieParser(cookieSecret)); //요청된 쿠키를 파싱
app.use(express.static(path.join(__dirname, "public"))); //정적 파일을 제공하기 위한 경로를 설정합니다. 여기서 __dirname은 현재 실행 중인 스크립트가 위치한 디렉토리의 절대 경로
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public/views")); // view 파일들이 모여있는 폴더 지정

// session에 cookie를 담음
// httpOnly: 클라이언트 측 스크립트가 쿠키에 접근하는 것을 방지합니다. XSS 공격으로부터 보호하는 데 도움이 됩니다.
// sameSite: CSRF 공격 방지를 위해 쿠키가 같은 사이트 요청에만 보내지도록 합니다. 'strict', 'lax', 'none' 중 하나로 설정할 수 있습니다.
// maxAge: 쿠키의 최대 수명을 설정합니다. 이는 쿠키가 언제 만료될지 결정합니다.
// resave: 세션이 변경되지 않아도 항상 세션을 저장할지 여부를 결정합니다. 일반적으로 false로 설정합니다.
// saveUninitialized: 초기화되지 않은 세션을 저장소에 저장할지 여부를 결정합니다. 로그인 세션 등 특정 상황에서만 세션을 생성하고 싶을 때 false로 설정합니다.
// 클라이언트에서 서버에 요청을 보낼때마다, cookie를 전달
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: cookieSecret,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    },
  })
);
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/test", testRouter);
app.use("/token", tokenRouter);

export default app;
